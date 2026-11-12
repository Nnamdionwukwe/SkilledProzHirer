// src/screens/main/JobApplicationsScreen.js
//
// Verbatim port of pages/hirer/JobApplications.jsx — now fully i18n'd.
//
// Endpoints (unchanged):
//   GET   /jobs/:id
//   GET   /jobs/:id/applications
//   PATCH /jobs/:id/applications/:appId/status
//   PATCH /jobs/:id/applications/:appId/unaccept
//   PATCH /jobs/:id/applications/:appId/reconsider
//
// Job stays OPEN after accepting an application — bookings are the formal
// contract. This matches web behaviour exactly.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { usePlatformRefresh } from "../../contexts/PlatformPollerContext";
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaStar,
  FaRegStar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaBriefcase,
  FaTrophy,
  FaMoneyBillWave,
  FaInbox,
  FaExclamationTriangle,
  FaClipboardList,
  FaQuoteLeft,
  FaTimes,
  FaExpand,
  FaUndo,
  FaVideo,
  FaCommentDots,
} from "../../icons/fa";

// ── Try to use the real InterviewCallButton; fall back to inline ───
let RealInterviewCallButton = null;
try {
  RealInterviewCallButton =
    require("../video/InterviewCallButton").default || null;
} catch {
  RealInterviewCallButton = null;
}

// ── Helpers ──────────────────────────────────────────────────────
function Stars({ rating = 0, total = 5, c }) {
  const rounded = Math.round(rating);
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {Array.from({ length: total }).map((_, i) =>
        i < rounded ? (
          <FaStar key={i} size={10} color={c.orange} />
        ) : (
          <FaRegStar key={i} size={10} color={c.textMuted} />
        ),
      )}
    </View>
  );
}

function statusMeta(status, t) {
  switch (status) {
    case "ACCEPTED":
      return {
        labelKey: "jobApplications.status.accepted",
        label: t("jobApplications.status.accepted"),
        color: "#22c55e",
        bg: "rgba(34,197,94,0.12)",
        icon: FaCheckCircle,
      };
    case "REJECTED":
      return {
        labelKey: "jobApplications.status.rejected",
        label: t("jobApplications.status.rejected"),
        color: "#ef4444",
        bg: "rgba(239,68,68,0.12)",
        icon: FaTimesCircle,
      };
    default:
      return {
        labelKey: "jobApplications.status.pending",
        label: t("jobApplications.status.pending"),
        color: "#fbbf24",
        bg: "rgba(251,191,36,0.12)",
        icon: FaClock,
      };
  }
}

// ═════════════════════════════════════════════════════════════════
// Inline InterviewCallButton — in-app video call pipeline
// ═════════════════════════════════════════════════════════════════
function InlineInterviewCallButton({
  jobPostId,
  workerId,
  workerName,
  jobTitle,
  navigation,
  c,
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [messageing, setMessageing] = useState(false);
  const [error, setError] = useState("");

  async function resolveConversationId() {
    try {
      const res = await client.get("/messages/conversations", {
        params: { page: 1, limit: 100, _t: Date.now() },
      });
      const list = res.data?.data?.conversations || [];
      const peerIdStr = String(workerId);
      const found = list.find((convo) =>
        (convo.users || []).some((u) => {
          const uid = String(u.userId || u.user?.id || u.id);
          return uid === peerIdStr;
        }),
      );
      if (found?.id) return found.id;
    } catch {}

    const res = await client.post("/messages", {
      receiverId: workerId,
      content: t("jobApplications.interview.chatSeed", {
        jobTitle: jobTitle || t("jobApplications.interview.theRole"),
      }),
    });
    return res.data?.data?.conversationId;
  }

  async function resolveInterviewUrl(conversationId) {
    const callRes = await client.post(
      `/voice-calls/${conversationId}/initiate`,
      {
        callType: "video",
        returnTo: "JobApplications",
        returnParams: { jobId: jobPostId },
      },
    );
    const call = callRes?.data?.data?.call;
    if (!call) throw new Error(t("jobApplications.interview.initiateFailed"));
    const url =
      call.roomUrl ||
      call.url ||
      call.meetingUrl ||
      call.joinUrl ||
      `https://meet.skilledproz.com/${conversationId}`;
    return url;
  }

  async function handleStartInterview() {
    if (!workerId) {
      setError(t("jobApplications.interview.missingWorker"));
      return;
    }
    setCreating(true);
    setError("");
    try {
      const conversationId = await resolveConversationId();
      if (!conversationId)
        throw new Error(t("jobApplications.interview.noConversation"));
      await resolveInterviewUrl(conversationId);
      navigation.navigate("VideoCall", {
        conversationId,
        returnTo: "JobApplications",
        returnParams: { jobId: jobPostId },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t("jobApplications.interview.startFailed"),
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleMessageLink() {
    if (!workerId) return;
    setMessageing(true);
    setError("");
    try {
      const conversationId = await resolveConversationId();
      if (!conversationId)
        throw new Error(t("jobApplications.interview.noConversation"));

      let url = null;
      try {
        url = await resolveInterviewUrl(conversationId);
      } catch {}

      const prefill = url
        ? t("jobApplications.interview.messageBody", {
            workerName: workerName || t("jobApplications.interview.there"),
            jobTitle: jobTitle || t("jobApplications.interview.theRole"),
            url,
          })
        : t("jobApplications.interview.messageBodyNoUrl", {
            workerName: workerName || t("jobApplications.interview.there"),
            jobTitle: jobTitle || t("jobApplications.interview.theRole"),
          });

      navigation.navigate("Chat", {
        conversationId,
        withUserId: workerId,
        prefillMessage: prefill,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t("jobApplications.interview.chatFailed"),
      );
      toast.error(t("jobApplications.interview.chatFailed"));
    } finally {
      setMessageing(false);
    }
  }

  const busy = creating || messageing;

  return (
    <View style={styles.interviewButtons}>
      <Pressable
        onPress={handleStartInterview}
        disabled={busy}
        style={({ pressed }) => [
          styles.interviewBtnPrimary,
          {
            backgroundColor: c.orange,
            opacity: creating ? 0.6 : pressed ? 0.9 : 1,
          },
        ]}
      >
        {creating ? (
          <ActivityIndicator size="small" color={c.bg} />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <FaVideo size={12} color={c.bg} />
            <AppText style={{ fontSize: 11, fontWeight: "700", color: c.bg }}>
              {t("jobApplications.interview.startCta")}
            </AppText>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={handleMessageLink}
        disabled={busy}
        style={({ pressed }) => [
          styles.interviewBtnSecondary,
          {
            borderColor: c.orangeGlow,
            backgroundColor: c.orangeDim,
            opacity: messageing ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {messageing ? (
          <ActivityIndicator size="small" color={c.orange} />
        ) : (
          <>
            <FaCommentDots size={11} color={c.orange} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: c.orange,
                marginLeft: 5,
              }}
            >
              {t("jobApplications.interview.messageLinkCta")}
            </AppText>
          </>
        )}
      </Pressable>

      {error ? (
        <AppText
          style={{
            fontSize: 10,
            color: c.red,
            marginTop: 4,
            width: "100%",
          }}
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function InterviewCallButton(props) {
  if (RealInterviewCallButton) {
    return <RealInterviewCallButton {...props} />;
  }
  return <InlineInterviewCallButton {...props} />;
}

// ═════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════
// src/screens/main/JobApplicationsScreen.js
// … (header comment unchanged) …

export default function JobApplicationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;
  const { user } = useAuthStore();

  const jobId = route.params?.jobId;

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [undoTarget, setUndoTarget] = useState(null);

  const fetchAll = useCallback(
    async (isRefresh = false, isSilent = false) => {
      if (!jobId) return;
      if (!isRefresh) setLoading(true);
      try {
        const [jobRes, appsRes] = await Promise.all([
          client.get(`/jobs/${jobId}`),
          client.get(`/jobs/${jobId}/applications`),
        ]);
        setJob(jobRes?.data?.data?.jobPost || jobRes?.data?.data);
        setApplications(appsRes?.data?.data?.applications || []);
      } catch (err) {
        // Poller never surfaces errors — user never sees a red banner
        // from a background refresh. Pull-to-refresh / focus still do.
        if (!isSilent) {
          setError(t("jobApplications.errors.loadFailed"));
        }
      } finally {
        if (!isRefresh) setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobId, t],
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  // ── Auto-refresh on focus (returning from CreateBookingFromJob) ──
  const hasMountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      fetchAll(true);
    }, [fetchAll]),
  );

  // ── Silent background refresh every 5s ──
  // Paused while a decision PATCH is in flight (updating !== null) or
  // while the Undo modal is open — otherwise a silent poll would race
  // with the optimistic state update and could flicker the status back.
  const fetchSilent = useCallback(() => fetchAll(true, true), [fetchAll]);

  usePlatformRefresh(fetchSilent, !updating && !undoTarget);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll(true);
  };

  const handleDecision = async (applicationId, status) => {
    setUpdating(applicationId);
    setError("");
    setSuccess("");
    try {
      await client.patch(
        `/jobs/${jobId}/applications/${applicationId}/status`,
        { status },
      );
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status } : a)),
      );
      setSuccess(
        status === "ACCEPTED"
          ? t("jobApplications.success.accepted")
          : t("jobApplications.success.rejected"),
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("jobApplications.errors.updateFailed"),
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleUnaccept = async ({ applicationId, hasBooking }) => {
    setUpdating(applicationId);
    setError("");
    setSuccess("");
    try {
      await client.patch(
        `/jobs/${jobId}/applications/${applicationId}/unaccept`,
      );
      setApplications((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, status: "PENDING" } : a,
        ),
      );
      setJob((prev) => ({ ...prev, status: "OPEN" }));
      setSuccess(
        hasBooking
          ? t("jobApplications.success.unacceptedWithBooking")
          : t("jobApplications.success.unaccepted"),
      );
      setUndoTarget(null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("jobApplications.errors.unacceptFailed"),
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleReconsider = async (applicationId) => {
    setUpdating(applicationId);
    setError("");
    setSuccess("");
    try {
      await client.patch(
        `/jobs/${jobId}/applications/${applicationId}/reconsider`,
      );
      setApplications((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, status: "PENDING" } : a,
        ),
      );
      setSuccess(t("jobApplications.success.reconsidered"));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("jobApplications.errors.reconsiderFailed"),
      );
    } finally {
      setUpdating(null);
    }
  };

  const pending = useMemo(
    () => applications.filter((a) => a.status === "PENDING"),
    [applications],
  );
  const accepted = useMemo(
    () => applications.filter((a) => a.status === "ACCEPTED"),
    [applications],
  );
  const declined = useMemo(
    () => applications.filter((a) => a.status === "REJECTED"),
    [applications],
  );
  const decided = useMemo(
    () => applications.filter((a) => a.status !== "PENDING"),
    [applications],
  );

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="detail" />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Back */}
      <Pressable
        onPress={() => {
          const isWorker = user?.role === "WORKER";
          const targetScreen = isWorker ? "WorkerJobDetail" : "JobDetail";
          if (jobId) {
            navigation.navigate(targetScreen, { jobId });
          } else {
            try {
              if (isWorker) {
                navigation.navigate("WorkerHome", { screen: "WorkerJobs" });
              } else {
                navigation.navigate("JobsManagement");
              }
            } catch {
              navigation.goBack();
            }
          }
        }}
        style={({ pressed }) => [
          styles.backBtn,
          { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <FaArrowLeft size={11} color={c.textDim} />
        <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
          {t("jobApplications.backToJob")}
        </AppText>
      </Pressable>

      {/* Job summary */}
      {job ? (
        <View
          style={[
            styles.jobSummary,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.summaryLeft}>
            <View
              style={[
                styles.summaryIcon,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              {job.category?.icon ? (
                <AppText style={{ fontSize: 20 }}>{job.category.icon}</AppText>
              ) : (
                <FaClipboardList size={18} color={c.orange} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText
                weight="displayBlack"
                style={{ fontSize: 10, letterSpacing: -0.5 }}
                numberOfLines={2}
              >
                {job.title}
              </AppText>
              <AppText
                style={{ fontSize: 11, color: c.textDim, marginTop: 3 }}
                numberOfLines={2}
              >
                {job.category?.name} · {job.address} ·{" "}
                {new Date(job.scheduledAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </AppText>
            </View>
          </View>

          <View style={styles.summaryStats}>
            <SummaryStat
              value={applications.length}
              label={t("jobApplications.summary.total")}
              color={c.orange}
              c={c}
            />
            <SummaryStat
              value={pending.length}
              label={t("jobApplications.summary.pending")}
              color={c.orange}
              c={c}
            />
            <SummaryStat
              value={accepted.length}
              label={t("jobApplications.summary.accepted")}
              color={c.green}
              c={c}
            />
            <SummaryStat
              value={declined.length}
              label={t("jobApplications.summary.declined")}
              color={c.red}
              c={c}
            />
          </View>
        </View>
      ) : null}

      {/* Alerts */}
      {error ? (
        <Pressable
          onPress={() => setError("")}
          style={[
            styles.alertBox,
            { backgroundColor: c.redDim, borderColor: c.red },
          ]}
        >
          <FaExclamationTriangle size={12} color={c.red} />
          <AppText
            style={{ fontSize: 12, color: c.red, flex: 1, marginLeft: 6 }}
          >
            {error}
          </AppText>
          <AppText style={{ color: c.red, fontSize: 16 }}>×</AppText>
        </Pressable>
      ) : null}
      {success ? (
        <Pressable
          onPress={() => setSuccess("")}
          style={[
            styles.alertBox,
            { backgroundColor: c.greenDim, borderColor: c.green },
          ]}
        >
          <FaCheckCircle size={12} color={c.green} />
          <AppText
            style={{ fontSize: 12, color: c.green, flex: 1, marginLeft: 6 }}
          >
            {success}
          </AppText>
          <AppText style={{ color: c.green, fontSize: 16 }}>×</AppText>
        </Pressable>
      ) : null}

      {/* Applications */}
      {applications.length === 0 ? (
        <View
          style={[
            styles.empty,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <FaInbox size={40} color={c.textMuted} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 17,
              fontWeight: "800",
              color: c.text,
              marginTop: 12,
              textAlign: "center",
            }}
          >
            {t("jobApplications.empty.title")}
          </AppText>
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              marginTop: 6,
              textAlign: "center",
              lineHeight: 18,
              maxWidth: 320,
            }}
          >
            {t("jobApplications.empty.subtitle")}
          </AppText>
        </View>
      ) : (
        <>
          {pending.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
                  {t("jobApplications.section.pending")}
                </AppText>
                <View
                  style={[
                    styles.sectionCount,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: c.orange,
                    }}
                  >
                    {pending.length}
                  </AppText>
                </View>
              </View>
              {pending.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  jobId={jobId}
                  jobTitle={job?.title}
                  updating={updating}
                  onAccept={() => handleDecision(app.id, "ACCEPTED")}
                  onReject={() => handleDecision(app.id, "REJECTED")}
                  onReconsider={() => handleReconsider(app.id)}
                  onUnacceptRequest={() =>
                    setUndoTarget({
                      applicationId: app.id,
                      workerName:
                        `${app.worker?.firstName || ""} ${app.worker?.lastName || ""}`.trim(),
                      hasBooking: !!app.latestBooking,
                    })
                  }
                  onAvatarClick={setLightboxSrc}
                  onViewProfile={() =>
                    navigation.navigate("WorkerProfile", {
                      userId: app.worker?.id,
                    })
                  }
                  navigation={navigation}
                  c={c}
                />
              ))}
            </View>
          ) : null}

          {decided.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
                  {t("jobApplications.section.reviewed")}
                </AppText>
                <View
                  style={[
                    styles.sectionCount,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: c.textDim,
                    }}
                  >
                    {decided.length}
                  </AppText>
                </View>
              </View>
              {decided.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  jobId={jobId}
                  jobTitle={job?.title}
                  updating={updating}
                  decided
                  onReconsider={() => handleReconsider(app.id)}
                  onUnacceptRequest={() =>
                    setUndoTarget({
                      applicationId: app.id,
                      workerName:
                        `${app.worker?.firstName || ""} ${app.worker?.lastName || ""}`.trim(),
                      hasBooking: !!app.latestBooking,
                    })
                  }
                  onAvatarClick={setLightboxSrc}
                  onViewProfile={() =>
                    navigation.navigate("WorkerProfile", {
                      userId: app.worker?.id,
                    })
                  }
                  navigation={navigation}
                  c={c}
                />
              ))}
            </View>
          ) : null}
        </>
      )}

      {/* Undo confirmation modal */}
      <Modal
        visible={!!undoTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setUndoTarget(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setUndoTarget(null)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.modalIcon,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.3)",
                },
              ]}
            >
              <FaUndo size={26} color={c.red} />
            </View>
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 17,
                fontWeight: "800",
                color: c.text,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {t("jobApplications.undo.title")}
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                lineHeight: 18,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {t("jobApplications.undo.bodyPrefix", {
                workerName:
                  undoTarget?.workerName || t("jobApplications.undo.theWorker"),
              })}
              {undoTarget?.hasBooking
                ? t("jobApplications.undo.bodyBookingSuffix")
                : ""}
            </AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setUndoTarget(null)}
                disabled={updating === undoTarget?.applicationId}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: "transparent",
                    borderColor: c.border,
                    borderWidth: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: c.textDim }}
                >
                  {t("jobApplications.undo.keep")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => handleUnaccept(undoTarget)}
                disabled={updating === undoTarget?.applicationId}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: c.red,
                    opacity:
                      updating === undoTarget?.applicationId
                        ? 0.5
                        : pressed
                          ? 0.9
                          : 1,
                  },
                ]}
              >
                {updating === undoTarget?.applicationId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <FaUndo size={11} color="#fff" />
                    <AppText
                      style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}
                    >
                      {t("jobApplications.undo.confirm")}
                    </AppText>
                  </View>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full-screen avatar lightbox */}
      <Modal
        visible={!!lightboxSrc}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxSrc(null)}
      >
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setLightboxSrc(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: 500, alignItems: "center" }}
          >
            <Pressable
              onPress={() => setLightboxSrc(null)}
              style={styles.lightboxClose}
            >
              <FaTimes size={18} color="#fff" />
            </Pressable>
            {lightboxSrc ? (
              <Image
                source={{ uri: lightboxSrc }}
                style={{ width: "100%", height: 400, borderRadius: 12 }}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

// ── Summary stat ────────────────────────────────────────────────
function SummaryStat({ value, label, color, c }) {
  return (
    <View style={styles.summaryStatCol}>
      <AppText
        weight="displayBlack"
        style={{
          fontSize: 15,
          letterSpacing: -0.5,
          marginBottom: 4,
          color,
        }}
      >
        {value}
      </AppText>
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          marginTop: 2,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// Application card
// ═════════════════════════════════════════════════════════════════
function ApplicationCard({
  app,
  jobId,
  jobTitle,
  updating,
  onAccept,
  onReject,
  onReconsider,
  onUnacceptRequest,
  onAvatarClick,
  onViewProfile,
  navigation,
  decided,
  c,
}) {
  const { t } = useTranslation();
  const { worker } = app;
  const wp = worker?.workerProfile;
  const statusInfo = statusMeta(app.status, t);
  const StatusIcon = statusInfo.icon;
  const hasAvatar = !!worker?.avatar;

  const latestBooking = app.latestBooking || null;
  const hasBooking = !!latestBooking;
  const bookingId = latestBooking?.id || null;

  return (
    <View
      style={[
        styles.appCard,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {/* Worker info */}
      <View style={styles.appTop}>
        <View style={styles.workerLeft}>
          <Pressable
            onPress={() => hasAvatar && onAvatarClick?.(worker.avatar)}
            disabled={!hasAvatar}
            style={[
              styles.workerAvatar,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            {hasAvatar ? (
              <>
                <Image
                  source={{ uri: worker.avatar }}
                  style={{ width: "100%", height: "100%" }}
                />
                <View
                  style={[
                    styles.avatarExpandBadge,
                    { backgroundColor: c.orange, borderColor: c.bgPanel },
                  ]}
                >
                  <FaExpand size={7} color="#fff" />
                </View>
              </>
            ) : (
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: c.orange }}
              >
                {worker?.firstName?.[0]}
                {worker?.lastName?.[0]}
              </AppText>
            )}
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={{ fontSize: 14, fontWeight: "600", color: c.text }}>
              {worker?.firstName} {worker?.lastName}
            </AppText>
            <AppText style={{ fontSize: 11, color: c.textDim }}>
              {wp?.title || t("jobApplications.card.defaultWorkerTitle")}
            </AppText>
            {worker?.city || worker?.country ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  marginTop: 2,
                }}
              >
                <FaMapMarkerAlt size={9} color={c.textMuted} />
                <AppText style={{ fontSize: 10, color: c.textMuted }}>
                  {[worker.city, worker.country].filter(Boolean).join(", ")}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusInfo.bg, borderColor: statusInfo.color },
          ]}
        >
          <StatusIcon size={10} color={statusInfo.color} />
          <AppText
            style={{
              fontSize: 9,
              fontWeight: "700",
              color: statusInfo.color,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginLeft: 3,
            }}
          >
            {statusInfo.label}
          </AppText>
        </View>
      </View>

      {/* Worker stats */}
      <View
        style={[
          styles.workerStats,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        {wp?.avgRating > 0 ? (
          <View style={styles.workerStatItem}>
            <Stars rating={wp.avgRating} c={c} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.text,
                marginLeft: 4,
              }}
            >
              {wp.avgRating.toFixed(1)}
            </AppText>
            {wp.totalReviews > 0 ? (
              <AppText
                style={{ fontSize: 10, color: c.textMuted, marginLeft: 3 }}
              >
                ({wp.totalReviews})
              </AppText>
            ) : null}
          </View>
        ) : null}
        {wp?.completedJobs > 0 ? (
          <View style={styles.workerStatItem}>
            <FaBriefcase size={9} color={c.textMuted} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.text,
                marginLeft: 3,
              }}
            >
              {t("jobApplications.card.jobsCount", {
                count: wp.completedJobs,
              })}
            </AppText>
          </View>
        ) : null}
        {wp?.hourlyRate ? (
          <View style={styles.workerStatItem}>
            <FaMoneyBillWave size={9} color={c.textMuted} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.text,
                marginLeft: 3,
              }}
            >
              {wp.currency} {wp.hourlyRate.toLocaleString()}
              {t("jobApplications.card.perHourShort")}
            </AppText>
          </View>
        ) : null}
        {wp?.yearsExperience > 0 ? (
          <View style={styles.workerStatItem}>
            <FaTrophy size={9} color={c.textMuted} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.text,
                marginLeft: 3,
              }}
            >
              {t("jobApplications.card.yearsExp", {
                count: wp.yearsExperience,
              })}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Cover note */}
      {app.message ? (
        <View
          style={[
            styles.appMessage,
            { backgroundColor: c.bgInput, borderLeftColor: c.orangeGlow },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <FaQuoteLeft size={9} color={c.orange} />
            <AppText
              style={{
                fontSize: 9,
                fontWeight: "700",
                color: c.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {t("jobApplications.card.coverNote")}
            </AppText>
          </View>
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              fontStyle: "italic",
              marginTop: 4,
              lineHeight: 18,
            }}
          >
            "{app.message}"
          </AppText>
        </View>
      ) : null}

      {/* Applied date */}
      <AppText style={{ fontSize: 10, color: c.textMuted, marginTop: 8 }}>
        {t("jobApplications.card.applied", {
          date: new Date(app.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          time: new Date(app.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })}
      </AppText>

      {/* Pending actions */}
      {!decided ? (
        <>
          <View
            style={[
              styles.appActions,
              { borderTopColor: c.border, marginTop: 10, paddingTop: 10 },
            ]}
          >
            <Pressable onPress={onViewProfile} hitSlop={6}>
              <AppText
                style={{ fontSize: 11, fontWeight: "600", color: c.orange }}
              >
                {t("jobApplications.card.viewProfile")} →
              </AppText>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable
                onPress={onReject}
                disabled={updating === app.id}
                style={({ pressed }) => [
                  styles.declineBtn,
                  {
                    borderColor: c.border,
                    opacity: updating === app.id ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {updating === app.id ? (
                  <ActivityIndicator size="small" color={c.textDim} />
                ) : (
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: c.textDim,
                    }}
                  >
                    {t("jobApplications.card.decline")}
                  </AppText>
                )}
              </Pressable>
              <Pressable
                onPress={onAccept}
                disabled={updating === app.id}
                style={({ pressed }) => [
                  styles.acceptBtn,
                  {
                    backgroundColor: c.orange,
                    opacity: updating === app.id ? 0.5 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                {updating === app.id ? (
                  <ActivityIndicator size="small" color={c.bg} />
                ) : (
                  <AppText
                    style={{ fontSize: 11, fontWeight: "700", color: c.bg }}
                  >
                    {t("jobApplications.card.accept")}
                  </AppText>
                )}
              </Pressable>
            </View>
          </View>

          <View style={[styles.interviewSection, { borderTopColor: c.border }]}>
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: c.text,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {t("jobApplications.card.interviewTitle")}
            </AppText>
            <AppText
              style={{
                fontSize: 11,
                color: c.textDim,
                marginTop: 3,
                marginBottom: 8,
                lineHeight: 16,
              }}
            >
              {t("jobApplications.card.interviewSubtitle")}
            </AppText>
            <InterviewCallButton
              jobPostId={jobId}
              workerId={worker?.id}
              workerName={`${worker?.firstName || ""} ${worker?.lastName || ""}`.trim()}
              jobTitle={jobTitle}
              navigation={navigation}
              c={c}
            />
          </View>
        </>
      ) : null}

      {/* Accepted row */}
      {decided && app.status === "ACCEPTED" ? (
        <View style={[styles.acceptedRow, { borderTopColor: c.border }]}>
          <View
            style={[
              styles.acceptedNote,
              { backgroundColor: c.greenDim, borderColor: c.green },
            ]}
          >
            <FaCheckCircle size={11} color={c.green} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: c.green,
                marginLeft: 5,
              }}
            >
              {t("jobApplications.status.accepted")}
            </AppText>
          </View>

          <View style={styles.acceptedActions}>
            {hasBooking ? (
              <Pressable
                onPress={() =>
                  navigation.navigate("BookingDetail", { bookingId })
                }
                style={({ pressed }) => [
                  styles.bookLinkSecondary,
                  { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: c.textDim,
                  }}
                >
                  {t("jobApplications.card.viewLatestBooking")} →
                </AppText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                navigation.navigate("CreateBookingFromJob", {
                  jobPostId: app.jobPostId,
                  workerId: worker?.id,
                })
              }
              style={({ pressed }) => [
                styles.bookLinkPrimary,
                { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <AppText style={{ fontSize: 11, fontWeight: "700", color: c.bg }}>
                {hasBooking
                  ? `${t("jobApplications.card.createAnotherBooking")} →`
                  : `${t("jobApplications.card.createBooking")} →`}
              </AppText>
            </Pressable>
            <Pressable
              onPress={onUnacceptRequest}
              disabled={updating === app.id}
              style={({ pressed }) => [
                styles.unacceptBtn,
                {
                  borderColor: c.border,
                  opacity: updating === app.id ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {updating === app.id ? (
                <ActivityIndicator size="small" color={c.textDim} />
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <FaUndo size={10} color={c.textDim} />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: c.textDim,
                    }}
                  >
                    {t("jobApplications.card.undoAcceptance")}
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Rejected row */}
      {decided && app.status === "REJECTED" ? (
        <View style={[styles.acceptedRow, { borderTopColor: c.border }]}>
          <View style={styles.rejectedNote}>
            <FaTimesCircle size={11} color={c.red} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.red,
                marginLeft: 5,
              }}
            >
              {t("jobApplications.status.rejected")}
            </AppText>
          </View>
          <View style={styles.acceptedActions}>
            <Pressable
              onPress={onReconsider}
              disabled={updating === app.id}
              style={({ pressed }) => [
                styles.reconsiderBtn,
                {
                  borderColor: c.border,
                  opacity: updating === app.id ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {updating === app.id ? (
                <ActivityIndicator size="small" color={c.textDim} />
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <FaUndo size={10} color={c.text} />
                  <AppText
                    style={{ fontSize: 11, fontWeight: "600", color: c.text }}
                  >
                    {t("jobApplications.card.reconsider")}
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  jobSummary: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 12,
  },
  summaryStatCol: { alignItems: "center", flex: 1 },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 16,
  },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  appCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  appTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  workerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    position: "relative",
  },
  avatarExpandBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  workerStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  workerStatItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  appMessage: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 2,
    borderRadius: 4,
    marginTop: 10,
  },
  appActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
    gap: 8,
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  interviewSection: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginTop: 12,
    paddingTop: 12,
  },
  interviewButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  interviewBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 120,
    minHeight: 36,
  },
  interviewBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
  },
  acceptedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginTop: 12,
    paddingTop: 12,
  },
  acceptedNote: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  acceptedActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginLeft: "auto",
  },
  bookLinkSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  bookLinkPrimary: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  unacceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectedNote: {
    flexDirection: "row",
    alignItems: "center",
  },
  reconsiderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
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
    alignItems: "center",
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: -40,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
