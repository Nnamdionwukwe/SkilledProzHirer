// src/screens/main/InterviewCallRoomScreen.js
//
// Mobile port of the web's InterviewCallRoom.jsx.
//
// Role-aware behaviour:
//   • Hirer  → on end, navigates to JobApplications (their job management)
//   • Worker → on end, navigates to JobDetail (public job page)
//
// Polls GET /jobs/applications/:applicationId/call every 5s. When the
// backend flips the row to ENDED/DECLINED, the screen shows the goodbye
// state and auto-navigates after 2s. "Leave Call" PATCHes the backend
// end endpoint and does the same locally.

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../../components/AppText";
import client from "../../api/client";
import { useAuthStore } from "../../store/authStore";

const POLL_MS = 5000;
const REDIRECT_DELAY_MS = 2000;

// Extra space between the notch/status bar and the "Leave Call" bar.
// Bump this up if the bar still feels too close to the top.
const TOP_BAR_EXTRA_PADDING = 18;

export default function InterviewCallRoomScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const applicationId = route.params?.applicationId;
  const jobPostIdFromParams = route.params?.jobPostId;

  const [callUrl, setCallUrl] = useState(null);
  const [callId, setCallId] = useState(null);
  const [jobPostId, setJobPostId] = useState(jobPostIdFromParams || null);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);

  const mountedRef = useRef(true);
  const pollRef = useRef(null);

  const getRedirectTarget = () => {
    if (!jobPostId) {
      return { screen: null, params: null };
    }
    if (user?.role === "HIRER") {
      return { screen: "JobApplications", params: { jobId: jobPostId } };
    }
    return { screen: "WorkerJobDetail", params: { jobId: jobPostId } };
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // ── Initial fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!applicationId) {
      setError("Missing application ID");
      return;
    }
    let cancelled = false;
    client
      .get(`/jobs/applications/${applicationId}/call`)
      .then((res) => {
        if (cancelled || !mountedRef.current) return;
        const data = res.data?.data;
        if (data?.callUrl) {
          setCallUrl(data.callUrl);
          setCallId(data.callId || null);
          if (data.jobPostId) setJobPostId(data.jobPostId);
        } else {
          setError("Call has ended or does not exist.");
        }
      })
      .catch((err) => {
        if (cancelled || !mountedRef.current) return;
        if (err.response?.status === 404) {
          setEnded(true);
        } else {
          setError(
            err.response?.data?.message || "Failed to load the interview room.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  // ── Poll for status ───────────────────────────────────────────────────
  useEffect(() => {
    if (!callUrl || ended) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await client.get(
          `/jobs/applications/${applicationId}/call`,
        );
        const status = res.data?.data?.status;
        if (status === "ENDED" || status === "DECLINED") {
          if (mountedRef.current) setEnded(true);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch (err) {
        if (err.response?.status === 404) {
          if (mountedRef.current) setEnded(true);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }
    }, POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [applicationId, callUrl, ended]);

  // ── Auto-redirect when ended ──────────────────────────────────────────
  useEffect(() => {
    if (!ended) return;
    const timer = setTimeout(() => {
      const { screen, params } = getRedirectTarget();
      if (screen) {
        navigation.navigate(screen, params);
      } else {
        navigation.goBack();
      }
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  // ── Leave call handler ────────────────────────────────────────────────
  async function handleLeave() {
    if (callId) {
      try {
        await client.patch(`/video-calls/${callId}/end`);
      } catch {
        /* silent */
      }
    }
    if (mountedRef.current) setEnded(true);
  }

  function handleLeaveNow() {
    const { screen, params } = getRedirectTarget();
    if (screen) {
      navigation.navigate(screen, params);
    } else {
      navigation.goBack();
    }
  }

  // ── Ended ─────────────────────────────────────────────────────────────
  if (ended) {
    return (
      <SafeAreaView style={styles.endedPage}>
        <View style={styles.endedContent}>
          <View style={styles.endedIconWrap}>
            <Ionicons name="call" size={36} color="#ef4444" />
          </View>
          <AppText style={styles.endedTitle}>Call Ended</AppText>
          <AppText style={styles.endedSubtitle}>
            Returning to job details…
          </AppText>
          <Pressable
            onPress={handleLeaveNow}
            style={({ pressed }) => [
              styles.endedBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <AppText style={styles.endedBtnLabel}>Go Back Now</AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.endedPage}>
        <View style={styles.endedContent}>
          <View
            style={[
              styles.endedIconWrap,
              { backgroundColor: "rgba(239,68,68,0.12)" },
            ]}
          >
            <Ionicons name="videocam-off" size={36} color="#ef4444" />
          </View>
          <AppText style={styles.endedTitle}>Call Unavailable</AppText>
          <AppText style={styles.endedSubtitle}>{error}</AppText>
          <Pressable
            onPress={handleLeaveNow}
            style={({ pressed }) => [
              styles.endedBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <AppText style={styles.endedBtnLabel}>Go Back</AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────
  if (!callUrl) {
    return (
      <SafeAreaView style={styles.endedPage}>
        <View style={styles.endedContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <AppText style={[styles.endedSubtitle, { marginTop: 16 }]}>
            Connecting to interview room…
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active room ───────────────────────────────────────────────────────
  return (
    <View style={styles.page}>
      {/* Top bar — manual top padding so the bar sits lower than the
          notch / status bar. Adjust TOP_BAR_EXTRA_PADDING above if it
          still feels too close to the top. */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + TOP_BAR_EXTRA_PADDING },
        ]}
      >
        <Pressable
          onPress={handleLeave}
          style={({ pressed }) => [
            styles.leaveBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={16} color="#fff" />
          <AppText style={styles.leaveBtnLabel}>Leave Call</AppText>
        </Pressable>

        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <AppText style={styles.liveText}>LIVE</AppText>
        </View>

        <AppText style={styles.tag}>INTERVIEW SESSION</AppText>
      </View>

      {/* MiroTalk iframe equivalent */}
      <WebView
        source={{ uri: callUrl }}
        style={styles.webview}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        originWhitelist={["*"]}
        cacheEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0a0a0a" },
  endedPage: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  endedContent: { alignItems: "center", gap: 8 },
  endedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 2,
    borderColor: "rgba(239,68,68,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  endedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginTop: 8,
  },
  endedSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginTop: 4,
  },
  endedBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
  },
  endedBtnLabel: { fontSize: 13, fontWeight: "700", color: "#fff" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14, // ← moved from paddingVertical; top is now dynamic
    backgroundColor: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  leaveBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  leaveBtnLabel: { fontSize: 13, fontWeight: "600", color: "#fff " },
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
  tag: {
    marginLeft: "auto",
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  webview: { flex: 1, backgroundColor: "#000" },
});
