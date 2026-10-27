// src/screens/main/JobApplicationsScreen.js
//
// Verbatim port of pages/hirer/JobApplications.jsx.
//
// Endpoints:
//   GET   /jobs/:id
//   GET   /jobs/:id/applications
//   PATCH /jobs/:id/applications/:appId/status     (accept / reject)
//   PATCH /jobs/:id/applications/:appId/unaccept   (undo accept)
//   PATCH /jobs/:id/applications/:appId/reconsider (reject → pending)
//   POST  /interviews                              (create video room)
//
// Job stays OPEN after accepting an application — bookings are the
// formal contract. This matches web behaviour exactly.
//
// InterviewCallButton:
//   · If ../video/InterviewCallButton exists, uses it.
//   · Otherwise, renders an inline fallback with the SAME three buttons
//     as the web component: Start Interview, Message Link, Copy Link.

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
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
  FaCopy,
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

const APP_STATUS = {
  PENDING: {
    label: "Pending",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    icon: FaClock,
  },
  ACCEPTED: {
    label: "Accepted",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    icon: FaCheckCircle,
  },
  REJECTED: {
    label: "Rejected",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    icon: FaTimesCircle,
  },
};

// ═════════════════════════════════════════════════════════════════
// Inline InterviewCallButton (verbatim web behaviour)
// Renders:
//   · Start Interview    → POST /interviews → open Jitsi
//   · Message Link       → copy invite text + open Chat with prefilled
//   · Copy Link          → clipboard + toast
// Once a room exists, all three stay visible AND a "Room ready" pill
// is shown beneath them.
// ═════════════════════════════════════════════════════════════════
function InlineInterviewCallButton({
  jobPostId,
  workerId,
  workerName,
  jobTitle,
  navigation,
  c,
}) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [room, setRoom] = useState(null); // { roomUrl, roomName, callId }
  const [error, setError] = useState("");

  const inviteText = useMemo(() => {
    if (!room) return "";
    return (
      `Hi ${workerName || "there"}, I'd like to interview you for "${jobTitle || "the role"}". ` +
      `Join my video room here: ${room.roomUrl}`
    );
  }, [room, workerName, jobTitle]);

  async function handleStartInterview() {
    // If room already exists → just reopen it
    if (room?.roomUrl) {
      Linking.openURL(room.roomUrl).catch(() =>
        toast.error("Couldn't open the video room."),
      );
      return;
    }
    if (!workerId || !jobPostId) return;
    setCreating(true);
    setError("");
    try {
      const res = await client.post("/interviews", {
        jobPostId,
        workerId,
        title: jobTitle,
      });
      const data = res?.data?.data?.call || res?.data?.data;
      const roomUrl =
        data?.roomUrl ||
        data?.meetingUrl ||
        data?.jitsiUrl ||
        (data?.roomName ? `https://meet.jit.si/${data.roomName}` : null);
      if (!roomUrl) {
        throw new Error("No room URL returned");
      }
      setRoom({
        roomUrl,
        roomName: data?.roomName || roomUrl.split("/").pop(),
        callId: data?.id,
      });
      await Linking.openURL(roomUrl).catch(() => {});
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to start interview. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleMessageLink() {
    if (!room?.roomUrl) {
      // If no room yet → create first, then navigate to chat
      await handleStartInterview();
      // fallthrough: navigation should still happen after room is set
    }
    const text = room?.roomUrl
      ? inviteText
      : `Hi ${workerName || "there"}, I'd like to interview you for "${jobTitle || "the role"}". I'll send a video link shortly.`;
    if (navigation) {
      navigation.navigate("Chat", {
        userId: workerId,
        prefillMessage: text,
      });
    }
  }

  async function handleCopyLink() {
    if (!room?.roomUrl) {
      toast.info("Start the interview first to get a room link.");
      return;
    }
    try {
      await Clipboard.setStringAsync(room.roomUrl);
      toast.success("Room link copied to clipboard.");
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  return (
    <View style={styles.interviewButtons}>
      {/* Start Interview — primary */}
      <Pressable
        onPress={handleStartInterview}
        disabled={creating}
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
              {room ? "Rejoin Interview" : "Start Interview"}
            </AppText>
          </View>
        )}
      </Pressable>

      {/* Message Link — secondary */}
      <Pressable
        onPress={handleMessageLink}
        disabled={creating}
        style={({ pressed }) => [
          styles.interviewBtnSecondary,
          {
            borderColor: c.orangeGlow,
            backgroundColor: c.orangeDim,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <FaCommentDots size={11} color={c.orange} />
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: c.orange,
            marginLeft: 5,
          }}
        >
          Message Link
        </AppText>
      </Pressable>

      {/* Copy Link — tertiary ghost */}
      <Pressable
        onPress={handleCopyLink}
        disabled={creating || !room}
        style={({ pressed }) => [
          styles.interviewBtnTertiary,
          {
            borderColor: c.border,
            opacity: !room ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <FaCopy size={10} color={c.textDim} />
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: c.textDim,
            marginLeft: 5,
          }}
        >
          Copy Link
        </AppText>
      </Pressable>

      {/* Room-ready indicator */}
      {room ? (
        <View
          style={[
            styles.roomReadyPill,
            { backgroundColor: c.greenDim, borderColor: c.green },
          ]}
        >
          <FaCheckCircle size={9} color={c.green} />
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "600",
              color: c.green,
              marginLeft: 4,
            }}
            numberOfLines={1}
          >
            Room ready · {room.roomName}
          </AppText>
        </View>
      ) : null}

      {/* Error */}
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

// Wrapper that prefers the real component when available
function InterviewCallButton(props) {
  if (RealInterviewCallButton) {
    return <RealInterviewCallButton {...props} />;
  }
  return <InlineInterviewCallButton {...props} />;
}

// ═════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════
export default function JobApplicationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

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

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchAll = useCallback(
    async (isRefresh = false) => {
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
        setError("Failed to load applications.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [jobId],
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll(true);
  };

  // ── Decisions ─────────────────────────────────────────────────
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
          ? "Application accepted! You can now create a booking for this worker. The job stays open for more hires."
          : "Application rejected.",
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update application.");
    } finally {
      setUpdating(null);
    }
  };

  // ── Undo acceptance ──────────────────────────────────────────
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
          ? "Acceptance undone. The application is back in Pending Review and the job is open again. The existing booking was not affected."
          : "Acceptance undone. The application is back in Pending Review and the job is open again.",
      );
      setUndoTarget(null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to undo. Please try again or contact support.",
      );
    } finally {
      setUpdating(null);
    }
  };

  // ── Reconsider rejection ──────────────────────────────────────
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
      setSuccess(
        "Application moved back to Pending Review. You can accept, decline, or interview the worker again.",
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to reconsider. Please try again.",
      );
    } finally {
      setUpdating(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────
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

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="detail" />
      </AppScreen>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
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
        onPress={() => navigation.navigate("JobsManagement")}
        style={({ pressed }) => [
          styles.backBtn,
          { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <FaArrowLeft size={11} color={c.textDim} />
        <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
          Back to Jobs
        </AppText>
      </Pressable>

      {/* ── Job summary ─────────────────────────────────────────── */}
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
                style={{
                  fontFamily: "Syne_700Bold",
                  fontSize: 15,
                  fontWeight: "700",
                  color: c.text,
                }}
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

          {/* Stats grid */}
          <View style={styles.summaryStats}>
            <SummaryStat
              value={applications.length}
              label="Total"
              color={c.orange}
              c={c}
            />
            <SummaryStat
              value={pending.length}
              label="Pending"
              color={c.orange}
              c={c}
            />
            <SummaryStat
              value={accepted.length}
              label="Accepted"
              color={c.green}
              c={c}
            />
            <SummaryStat
              value={declined.length}
              label="Declined"
              color={c.red}
              c={c}
            />
          </View>
        </View>
      ) : null}

      {/* ── Alerts ──────────────────────────────────────────────── */}
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

      {/* ── Applications ────────────────────────────────────────── */}
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
            }}
          >
            No applications yet
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
            Workers haven't applied to this job yet. Share it to get more
            visibility.
          </AppText>
        </View>
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
                  Pending Review
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
                    navigation.navigate("Profile", {
                      userId: app.worker?.id,
                    })
                  }
                  navigation={navigation}
                  c={c}
                />
              ))}
            </View>
          ) : null}

          {/* Decided */}
          {decided.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
                  Reviewed
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
                    navigation.navigate("Profile", {
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

      {/* ── Undo confirmation modal ─────────────────────────────── */}
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
              Undo this acceptance?
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
              This will return{" "}
              <AppText style={{ fontWeight: "700", color: c.text }}>
                {undoTarget?.workerName || "the worker"}
              </AppText>
              's application to Pending Review and set the job back to Open. You
              can accept a different applicant, or accept this worker again
              afterwards.
              {undoTarget?.hasBooking ? (
                <>
                  {" "}
                  <AppText style={{ fontWeight: "700", color: c.text }}>
                    The existing booking with this worker will not be affected
                  </AppText>{" "}
                  — you can still view, cancel, or manage it from the booking
                  detail page.
                </>
              ) : null}
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
                  Keep it
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
                      Undo Acceptance
                    </AppText>
                  </View>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Full-screen avatar lightbox ─────────────────────────── */}
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
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 20,
          fontWeight: "800",
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
  const { worker } = app;
  const wp = worker?.workerProfile;
  const statusInfo = APP_STATUS[app.status] || APP_STATUS.PENDING;
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
              {wp?.title || "Worker"}
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
              {wp.completedJobs} jobs
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
              {wp.currency} {wp.hourlyRate.toLocaleString()}/hr
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
              {wp.yearsExperience} yrs exp
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
              Cover note
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
        Applied{" "}
        {new Date(app.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}{" "}
        at{" "}
        {new Date(app.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </AppText>

      {/* ── Pending actions ─────────────────────────────────────── */}
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
                View Profile →
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
                    Decline
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
                    Accept
                  </AppText>
                )}
              </Pressable>
            </View>
          </View>

          {/* Interview section — 3 buttons */}
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
              Interview this worker
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
              Start a quick face-to-face video call before you decide. You can
              also send the room link as a message.
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

      {/* ── Accepted row ────────────────────────────────────────── */}
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
              Accepted
            </AppText>
          </View>

          <View style={styles.acceptedActions}>
            {hasBooking ? (
              <Pressable
                onPress={() =>
                  navigation.navigate("BookingDetail", {
                    bookingId,
                  })
                }
                style={({ pressed }) => [
                  styles.bookLinkSecondary,
                  { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <AppText
                  style={{ fontSize: 11, fontWeight: "600", color: c.textDim }}
                >
                  View Latest Booking →
                </AppText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                navigation.navigate("CreateBooking", {
                  workerId: worker?.id,
                  jobPostId: app.jobPostId,
                })
              }
              style={({ pressed }) => [
                styles.bookLinkPrimary,
                { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <AppText style={{ fontSize: 11, fontWeight: "700", color: c.bg }}>
                {hasBooking ? "Create Another Booking →" : "Create Booking →"}
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
                    Undo Acceptance
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ── Rejected row ────────────────────────────────────────── */}
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
              Rejected
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
                    Reconsider
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
  interviewBtnTertiary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
  },
  roomReadyPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
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
