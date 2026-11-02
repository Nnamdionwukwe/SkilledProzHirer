// src/screens/main/CampaignDashboardScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Verbatim mirror of the website's /referral/campaign page
// (src/pages/referral/CampaignDashboard.jsx). All visuals use Ionicons.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Share,
  Modal,
  StyleSheet,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "../../components/AppText";
import Card from "../../components/Card";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const APP_URL = "https://skilledproz.com";

const TASKS = [
  {
    key: "hasDownloadedApp",
    labelKey: "campaign.task.download",
    iconName: "phone-portrait-outline",
    color: "#60a5fa",
    auto: true,
  },
  {
    key: "hasSetupProfile",
    labelKey: "campaign.task.profile",
    iconName: "person-outline",
    color: "#a78bfa",
    auto: true,
  },
  {
    key: "hasFollowedFb",
    labelKey: "campaign.task.facebook",
    iconName: "logo-facebook",
    color: "#3b82f6",
    platform: "facebook",
  },
  {
    key: "hasFollowedIg",
    labelKey: "campaign.task.instagram",
    iconName: "logo-instagram",
    color: "#ec4899",
    platform: "instagram",
  },
  {
    key: "hasFollowedTt",
    labelKey: "campaign.task.tiktok",
    iconName: "logo-tiktok",
    color: "#000000",
    platform: "tiktok",
  },
];

const SUBMISSION_META = {
  PENDING: { labelKey: "campaign.status.pending", cls: "yellow" },
  REVIEWING: { labelKey: "campaign.status.reviewing", cls: "orange" },
  APPROVED: { labelKey: "campaign.status.approved", cls: "green" },
  PARTIAL: { labelKey: "campaign.status.partial", cls: "blue" },
  REJECTED: { labelKey: "campaign.status.declined", cls: "red" },
};

const REFERRAL_META = {
  PENDING: { labelKey: "campaign.refStatus.inProgress", cls: "yellow" },
  TASKS_DONE: { labelKey: "campaign.refStatus.ready", cls: "green" },
  SUBMITTED: { labelKey: "campaign.refStatus.submitted", cls: "indigo" },
  APPROVED: { labelKey: "campaign.refStatus.approved", cls: "green" },
  REJECTED: { labelKey: "campaign.refStatus.rejected", cls: "red" },
};

const REFERRAL_PROGRAM_STATUS_META = {
  PENDING: { labelKey: "campaign.program.pending", cls: "yellow" },
  QUALIFIED: { labelKey: "campaign.program.qualified", cls: "indigo" },
  CONVERTED: { labelKey: "campaign.program.converted", cls: "blue" },
  REWARDED: { labelKey: "campaign.program.rewarded", cls: "green" },
  EXPIRED: { labelKey: "campaign.program.expired", cls: "dim" },
  FLAGGED: { labelKey: "campaign.program.flagged", cls: "red" },
};

const PLATFORM_STYLE = {
  facebook: {
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.35)",
    color: "#3b82f6",
  },
  instagram: {
    bg: "rgba(236,72,153,0.12)",
    border: "rgba(236,72,153,0.35)",
    color: "#ec4899",
  },
  tiktok: {
    bg: "rgba(107,114,128,0.12)",
    border: "rgba(107,114,128,0.35)",
    color: "#ffffff",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtAmt = (n) =>
  `₦${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const timeAgo = (d, t) => {
  if (!d) return "—";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return t("campaign.justNow");
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
};

function statusColors(cls, c) {
  switch (cls) {
    case "yellow":
      return {
        color: "#eab308",
        bg: "rgba(234,179,8,0.12)",
        border: "rgba(234,179,8,0.35)",
      };
    case "orange":
      return { color: c.orange, bg: c.orangeDim, border: c.orange + "55" };
    case "indigo":
      return {
        color: "#818cf8",
        bg: "rgba(129,140,248,0.12)",
        border: "rgba(129,140,248,0.35)",
      };
    case "blue":
      return {
        color: "#60a5fa",
        bg: "rgba(59,130,246,0.10)",
        border: "rgba(59,130,246,0.30)",
      };
    case "green":
      return {
        color: "#22c55e",
        bg: "rgba(34,197,94,0.12)",
        border: "rgba(34,197,94,0.35)",
      };
    case "red":
      return {
        color: "#ef4444",
        bg: "rgba(239,68,68,0.12)",
        border: "rgba(239,68,68,0.30)",
      };
    case "dim":
    default:
      return { color: c.textMuted, bg: c.bgCard, border: c.border };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ status, meta, t, c }) {
  const m = meta[status] || { labelKey: null, cls: "dim" };
  const label = m.labelKey ? t(m.labelKey) : status;
  const col = statusColors(m.cls, c);
  return (
    <View
      style={[a.badge, { backgroundColor: col.bg, borderColor: col.border }]}
    >
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: col.color,
          letterSpacing: 0.4,
        }}
      >
        {String(label).toUpperCase()}
      </AppText>
    </View>
  );
}

function ReferralProgramBadge({ status, t, c }) {
  if (!status) return null;
  const m = REFERRAL_PROGRAM_STATUS_META[status] || {
    labelKey: null,
    cls: "dim",
  };
  const label = m.labelKey ? t(m.labelKey) : `Referral: ${status}`;
  const col = statusColors(m.cls, c);
  return (
    <View
      style={[
        a.badge,
        {
          backgroundColor: col.bg,
          borderColor: col.border,
          flexDirection: "row",
          alignItems: "center",
        },
      ]}
    >
      <Ionicons
        name="people-outline"
        size={11}
        color={col.color}
        style={{ marginRight: 4 }}
      />
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: col.color,
          letterSpacing: 0.4,
        }}
      >
        {String(label).toUpperCase()}
      </AppText>
    </View>
  );
}

function Avatar({ name, avatar, size = 34, c }) {
  const initials =
    name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: c.orange,
        backgroundColor: "rgba(249,115,22,0.12)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={{ width: size, height: size }} />
      ) : (
        <AppText
          style={{
            fontSize: size * 0.33,
            color: c.orange,
            fontWeight: "700",
          }}
        >
          {initials}
        </AppText>
      )}
    </View>
  );
}

function StatCard({ iconName, label, value, accent, c }) {
  const bg =
    accent === "green"
      ? "rgba(34,197,94,0.10)"
      : accent === "orange"
        ? "rgba(249,115,22,0.12)"
        : c.bgPanel;
  const bd =
    accent === "green"
      ? "rgba(34,197,94,0.30)"
      : accent === "orange"
        ? "rgba(249,115,22,0.35)"
        : c.border;
  const valColor =
    accent === "green" ? "#22c55e" : accent === "orange" ? c.orange : c.text;
  const iconColor =
    accent === "green" ? "#22c55e" : accent === "orange" ? c.orange : c.textDim;
  return (
    <View style={[st.card, { backgroundColor: bg, borderColor: bd }]}>
      <Ionicons name={iconName} size={17} color={iconColor} />
      <AppText
        weight="displayBlack"
        style={{
          fontSize: 22,
          lineHeight: 28,
          color: valColor,
          marginTop: 3,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
      <AppText
        style={{
          fontSize: 9,
          color: c.textMuted,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginTop: 2,
        }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
}

function TaskPips({ tasks, r, t, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 5,
      }}
    >
      {tasks.map((task) => {
        const done = r.tasks?.[task.key];
        return (
          <View
            key={task.key}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 1.5,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: done ? task.color : "transparent",
              borderColor: done ? task.color : c.border,
            }}
          >
            {done && (
              <Ionicons
                name="checkmark"
                size={10}
                color={task.color === "#000000" ? "#000" : "#fff"}
              />
            )}
          </View>
        );
      })}
      <AppText style={{ fontSize: 10, color: c.textMuted, marginLeft: 4 }}>
        {t("campaign.taskScore", {
          done: r.tasks?.completedCount ?? 0,
          total: r.tasks?.totalCount ?? 5,
        })}
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ height = 62, c, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [c.bgCard, c.border],
  });
  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius: 12,
          backgroundColor: bg,
          marginBottom: 8,
        },
        style,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULLSCREEN LIGHTBOX
// ─────────────────────────────────────────────────────────────────────────────
function FullscreenImage({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.94)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ maxWidth: "100%", maxHeight: "90%" }}
        >
          <Image
            source={{ uri: src }}
            style={{ width: 320, height: 400, borderRadius: 12 }}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable
          onPress={onClose}
          style={{
            position: "absolute",
            top: 48,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(20,20,20,0.85)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(src).catch(() => {})}
          style={{
            position: "absolute",
            bottom: 40,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: "rgba(20,20,20,0.85)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons name="open-outline" size={14} color="#fff" />
          <AppText variant="small" weight="semibold" style={{ color: "#fff" }}>
            {alt ? `Open ${alt}` : "Open"}
          </AppText>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL CARD
// ─────────────────────────────────────────────────────────────────────────────
function SocialCard({
  task,
  done,
  onReport,
  reporting,
  link,
  screenshotUrl,
  onError,
  onViewScreenshot,
  t,
  c,
}) {
  const [picked, setPicked] = useState(null);
  const isReporting = reporting === task.platform;
  const pc = PLATFORM_STYLE[task.platform] || PLATFORM_STYLE.facebook;

  async function pickFile() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        onError?.(t("campaign.social.permissionRequired"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const name =
        asset.fileName || `screenshot_${task.platform}_${Date.now()}.jpg`;
      const type = asset.mimeType || "image/jpeg";
      setPicked({ uri: asset.uri, name, type });
    } catch {
      onError?.(t("campaign.social.pickFailed"));
    }
  }

  function clearFile() {
    setPicked(null);
  }

  function submit() {
    if (!picked) {
      onError?.(t("campaign.social.needScreenshot"));
      return;
    }
    onReport(task.platform, picked);
  }

  return (
    <View
      style={[
        sf.card,
        {
          borderColor: done ? "rgba(34,197,94,0.35)" : pc.border,
          backgroundColor: done ? "rgba(34,197,94,0.06)" : pc.bg,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: pc.bg,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Ionicons name={task.iconName} size={22} color={pc.color} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {t(task.labelKey)}
          </AppText>
          <AppText variant="small" tone="dim">
            @skilledproz
          </AppText>
        </View>
        {done ? (
          <View
            style={[
              sf.doneBadge,
              {
                backgroundColor: "rgba(34,197,94,0.15)",
                borderColor: "rgba(34,197,94,0.4)",
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#22c55e",
                marginLeft: 4,
              }}
            >
              {t("campaign.social.done")}
            </AppText>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => Linking.openURL(link).catch(() => {})}
              style={[sf.followBtn, { backgroundColor: pc.color }]}
            >
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: task.platform === "tiktok" ? "#000" : "#000",
                }}
              >
                {t("campaign.social.follow")}
              </AppText>
            </Pressable>
          </View>
        )}
      </View>

      {!done && (
        <View style={{ marginTop: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginBottom: 8,
            }}
          >
            <Ionicons name="attach-outline" size={12} color={c.textMuted} />
            <AppText variant="small" tone="dim" style={{ flex: 1 }}>
              {t("campaign.social.uploadHint")}{" "}
              <AppText style={{ color: "#ef4444" }}>*</AppText>
            </AppText>
          </View>

          {!picked ? (
            <Pressable
              onPress={pickFile}
              style={[
                sf.chooseBtn,
                {
                  borderColor: c.border,
                  backgroundColor: c.bgPanel,
                },
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={14} color={c.text} />
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.text, marginLeft: 6 }}
              >
                {t("campaign.social.chooseImage")}
              </AppText>
            </Pressable>
          ) : (
            <View>
              <Pressable
                onPress={() => onViewScreenshot(picked.uri, task.platform)}
                style={{ alignSelf: "flex-start" }}
              >
                <Image
                  source={{ uri: picked.uri }}
                  style={sf.previewImg}
                  resizeMode="cover"
                />
              </Pressable>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Pressable
                  onPress={pickFile}
                  style={[
                    sf.previewBtn,
                    { borderColor: c.border, backgroundColor: c.bgCard },
                  ]}
                >
                  <AppText variant="small" weight="semibold" tone="dim">
                    {t("campaign.social.replace")}
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={clearFile}
                  style={[
                    sf.previewBtn,
                    {
                      borderColor: "rgba(239,68,68,0.35)",
                      backgroundColor: c.bgCard,
                    },
                  ]}
                >
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: "#ef4444" }}
                  >
                    {t("campaign.social.remove")}
                  </AppText>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable
            onPress={submit}
            disabled={!picked || isReporting}
            style={[
              sf.markBtn,
              {
                borderColor: picked ? "rgba(34,197,94,0.5)" : c.border,
                backgroundColor: c.bgPanel,
                opacity: !picked || isReporting ? 0.5 : 1,
                marginTop: 10,
              },
            ]}
          >
            {isReporting ? (
              <ActivityIndicator size="small" color={c.textMuted} />
            ) : (
              <AppText
                variant="small"
                weight="semibold"
                style={{
                  color: picked ? "#22c55e" : c.textMuted,
                }}
              >
                {t("campaign.social.markDone")}
              </AppText>
            )}
          </Pressable>
        </View>
      )}

      {done && screenshotUrl && (
        <Pressable
          onPress={() => onViewScreenshot(screenshotUrl, task.platform)}
          style={{
            marginTop: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons name="attach-outline" size={12} color={c.orange} />
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange }}
          >
            {t("campaign.social.viewScreenshot")}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSION CARD
// ─────────────────────────────────────────────────────────────────────────────
function SubmissionCard({ sub, t, c }) {
  const [open, setOpen] = useState(false);
  const meta = SUBMISSION_META[sub.status] || SUBMISSION_META.PENDING;
  const col = statusColors(meta.cls, c);

  return (
    <View
      style={[sk.card, { borderColor: col.border, backgroundColor: c.bgCard }]}
    >
      <Pressable onPress={() => setOpen((o) => !o)} style={sk.topRow}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <Ionicons name="calendar-outline" size={14} color={c.text} />
            <AppText variant="body" weight="semibold" style={{ color: c.text }}>
              {sub.date}
            </AppText>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Badge status={sub.status} meta={SUBMISSION_META} t={t} c={c} />
            <AppText variant="small" tone="dim">
              {t("campaign.history.submitted", {
                count: sub.totalSubmitted,
              })}
            </AppText>
            {sub.totalApproved > 0 && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Ionicons name="checkmark" size={11} color="#22c55e" />
                <AppText
                  style={{ fontSize: 11, fontWeight: "700", color: "#22c55e" }}
                >
                  {sub.totalApproved} {t("campaign.history.approved")}
                </AppText>
              </View>
            )}
            {sub.totalRejected > 0 && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Ionicons name="close" size={11} color="#ef4444" />
                <AppText
                  style={{ fontSize: 11, fontWeight: "700", color: "#ef4444" }}
                >
                  {sub.totalRejected} {t("campaign.history.rejected")}
                </AppText>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {sub.netAmount > 0 && (
            <AppText
              weight="displayBlack"
              style={{ fontSize: 18, color: "#22c55e" }}
            >
              {fmtAmt(sub.netAmount)}
            </AppText>
          )}
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={14}
            color={c.textMuted}
          />
        </View>
      </Pressable>

      {open && (
        <View style={[sk.expanded, { borderTopColor: c.border }]}>
          {sub.adminNote && (
            <View
              style={[
                sk.adminNote,
                {
                  backgroundColor: "rgba(249,115,22,0.08)",
                  borderColor: "rgba(249,115,22,0.25)",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 6,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={13}
                color={c.orange}
                style={{ marginTop: 1 }}
              />
              <AppText variant="small" tone="dim" style={{ flex: 1 }}>
                {t("campaign.history.admin")}: {sub.adminNote}
              </AppText>
            </View>
          )}
          {sub.referrals?.map((r) => {
            const rs = REFERRAL_META[r.status] || REFERRAL_META.PENDING;
            const rcol = statusColors(rs.cls, c);
            return (
              <View
                key={r.id}
                style={[sk.refRow, { borderBottomColor: c.border }]}
              >
                <Avatar name={r.name} avatar={r.avatar} size={30} c={c} />
                <AppText
                  variant="body"
                  style={{ flex: 1, color: c.text, marginLeft: 10 }}
                  numberOfLines={1}
                >
                  {r.name}
                </AppText>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 16,
                    borderWidth: 1,
                    backgroundColor: rcol.bg,
                    borderColor: rcol.border,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: rcol.color,
                    }}
                  >
                    {t(rs.labelKey).toUpperCase()}
                  </AppText>
                </View>
                {r.status === "APPROVED" && (
                  <AppText
                    weight="semibold"
                    style={{ fontSize: 13, color: "#22c55e", marginLeft: 8 }}
                  >
                    +{fmtAmt(r.reward)}
                  </AppText>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAW MODAL
// ─────────────────────────────────────────────────────────────────────────────
function WithdrawModal({
  visible,
  balance,
  minWithdrawal,
  onClose,
  onSuccess,
  c,
  modalBg,
  t,
  toast,
}) {
  const [form, setForm] = useState({
    amount: "",
    pin: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [pinNotSet, setPinNotSet] = useState(false);

  function setF(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setPinNotSet(false);
  }
  const setPercent = (pct) =>
    setF("amount", (pct === 1 ? balance : balance * pct).toFixed(0));

  async function submit() {
    const amt = parseFloat(form.amount);
    if (!amt || amt < minWithdrawal) {
      toast.error(
        t("campaign.withdraw.minError", { min: fmtAmt(minWithdrawal) }),
      );
      return;
    }
    if (amt > balance) {
      toast.error(
        t("campaign.withdraw.insufficient", { balance: fmtAmt(balance) }),
      );
      return;
    }
    if (!form.bankName || !form.accountNumber || !form.accountName) {
      toast.error(t("campaign.withdraw.bankRequired"));
      return;
    }
    if (!form.pin || form.pin.length !== 4) {
      toast.error(t("campaign.withdraw.pinRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await client.post("/campaign/withdraw", {
        amount: form.amount,
        pin: form.pin,
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
      });
      toast.success(t("campaign.withdraw.success"));
      setForm({
        amount: "",
        pin: "",
        bankName: "",
        accountNumber: "",
        accountName: "",
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || t("campaign.withdraw.failed");
      if (status === 403 && /pin/i.test(msg)) setPinNotSet(true);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }}
          onPress={onClose}
        >
          <Pressable
            style={[wm.sheet, { backgroundColor: modalBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[wm.handle, { backgroundColor: c.border }]} />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons name="card-outline" size={18} color="#22c55e" />
                <AppText
                  weight="displayBlack"
                  style={{ fontSize: 18, color: c.text }}
                >
                  {t("campaign.withdraw.title")}
                </AppText>
              </View>
              <Pressable
                onPress={onClose}
                style={[
                  wm.closeBtn,
                  { borderColor: c.border, backgroundColor: c.bgCard },
                ]}
              >
                <Ionicons name="close" size={16} color={c.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[
                  wm.balRow,
                  {
                    backgroundColor: "rgba(34,197,94,0.08)",
                    borderColor: "rgba(34,197,94,0.25)",
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <AppText
                    style={{
                      fontSize: 9,
                      color: "#22c55e",
                      letterSpacing: 0.8,
                      fontWeight: "700",
                    }}
                  >
                    {t("campaign.withdraw.available").toUpperCase()}
                  </AppText>
                  <AppText
                    weight="displayBlack"
                    style={{ color: "#22c55e", fontSize: 22, marginTop: 2 }}
                  >
                    {fmtAmt(balance)}
                  </AppText>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <AppText
                    style={{
                      fontSize: 9,
                      color: c.textMuted,
                      letterSpacing: 0.8,
                      fontWeight: "700",
                    }}
                  >
                    {t("campaign.withdraw.min").toUpperCase()}
                  </AppText>
                  <AppText
                    weight="semibold"
                    style={{ color: c.textMuted, fontSize: 14, marginTop: 2 }}
                  >
                    {fmtAmt(minWithdrawal)}
                  </AppText>
                </View>
              </View>

              <AppText style={[wm.sectionLabel, { color: c.textMuted }]}>
                {t("campaign.withdraw.amount")} *
              </AppText>
              <View
                style={[
                  wm.amtRow,
                  {
                    borderColor: c.border,
                    backgroundColor: c.bgInput,
                  },
                ]}
              >
                <View style={[wm.curBadge, { backgroundColor: c.bgPanel }]}>
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.textMuted }}
                  >
                    ₦ NGN
                  </AppText>
                </View>
                <TextInput
                  value={form.amount}
                  onChangeText={(v) => setF("amount", v.replace(/[^\d.]/g, ""))}
                  placeholder={`Min ${fmtAmt(minWithdrawal)}`}
                  placeholderTextColor={c.textMuted}
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    color: c.text,
                    fontSize: 18,
                    fontWeight: "700",
                    paddingHorizontal: 12,
                  }}
                />
              </View>
              <View style={wm.pctRow}>
                {[0.25, 0.5, 0.75, 1].map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPercent(p)}
                    style={[
                      wm.pctBtn,
                      { borderColor: c.border, backgroundColor: c.bgPanel },
                    ]}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: c.text }}
                    >
                      {p === 1 ? t("campaign.withdraw.max") : `${p * 100}%`}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <AppText style={[wm.sectionLabel, { color: c.textMuted }]}>
                {t("campaign.withdraw.bankSection").toUpperCase()}
              </AppText>
              {[
                {
                  k: "bankName",
                  label: t("campaign.withdraw.bankName"),
                  kb: "default",
                  ph: t("campaign.withdraw.bankNamePh"),
                },
                {
                  k: "accountNumber",
                  label: t("campaign.withdraw.accountNumber"),
                  kb: "numeric",
                  ph: t("campaign.withdraw.accountNumberPh"),
                  max: 10,
                },
                {
                  k: "accountName",
                  label: t("campaign.withdraw.accountName"),
                  kb: "default",
                  ph: t("campaign.withdraw.accountNamePh"),
                },
              ].map((f) => (
                <View key={f.k} style={{ marginBottom: 12 }}>
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.textMuted, marginBottom: 6 }}
                  >
                    {f.label} *
                  </AppText>
                  <TextInput
                    value={form[f.k]}
                    onChangeText={(v) => setF(f.k, v)}
                    placeholder={f.ph}
                    placeholderTextColor={c.textMuted}
                    keyboardType={f.kb}
                    maxLength={f.max}
                    style={[
                      wm.input,
                      {
                        color: c.text,
                        borderColor: c.border,
                        backgroundColor: c.bgInput,
                      },
                    ]}
                  />
                </View>
              ))}

              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.textMuted, marginBottom: 6 }}
              >
                {t("campaign.withdraw.pin")} *
              </AppText>
              <TextInput
                value={form.pin}
                onChangeText={(v) =>
                  setF("pin", v.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="••••"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                style={[
                  wm.input,
                  {
                    color: c.text,
                    borderColor: c.border,
                    backgroundColor: c.bgInput,
                    letterSpacing: 12,
                    textAlign: "center",
                    fontSize: 20,
                    fontWeight: "700",
                  },
                ]}
              />
              <AppText
                variant="small"
                tone="dim"
                style={{ marginTop: 4, marginBottom: 12, lineHeight: 16 }}
              >
                {t("campaign.withdraw.pinHint")}
              </AppText>

              {pinNotSet && (
                <Pressable
                  onPress={() =>
                    Linking.openURL(`${APP_URL}/settings?tab=security`).catch(
                      () => {},
                    )
                  }
                  style={{
                    marginBottom: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{
                      color: c.orange,
                      textDecorationLine: "underline",
                    }}
                  >
                    {t("campaign.withdraw.setPin")}
                  </AppText>
                  <Ionicons name="arrow-forward" size={12} color={c.orange} />
                </Pressable>
              )}

              <Pressable
                onPress={submit}
                disabled={submitting || !form.amount.trim()}
                style={[
                  wm.submitBtn,
                  {
                    backgroundColor:
                      submitting || !form.amount.trim() ? c.bgPanel : "#22c55e",
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <AppText
                    weight="semibold"
                    style={{
                      color:
                        submitting || !form.amount.trim()
                          ? c.textMuted
                          : "#000",
                      fontSize: 14,
                    }}
                  >
                    {t("campaign.withdraw.submit")}
                  </AppText>
                )}
              </Pressable>
              <AppText
                variant="small"
                tone="dim"
                style={{ textAlign: "center", marginTop: 8, marginBottom: 32 }}
              >
                {t("campaign.withdraw.note")}
              </AppText>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function CampaignDashboardScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";

  const [status, setStatus] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [myTasks, setMyTasks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("earn");
  const [copied, setCopied] = useState(false);
  const [showWd, setShowWd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [sRes, rRes, subRes, tRes] = await Promise.allSettled([
        client.get("/campaign/status"),
        client.get("/campaign/referrals?limit=50"),
        client.get("/campaign/submissions?limit=30"),
        client.get("/campaign/my-tasks"),
      ]);
      if (sRes.status === "fulfilled") {
        setStatus(sRes.value.data.data);
      }
      if (rRes.status === "fulfilled")
        setReferrals(rRes.value.data.data?.referrals || []);
      if (subRes.status === "fulfilled")
        setSubmissions(subRes.value.data.data?.submissions || []);
      if (tRes.status === "fulfilled") setMyTasks(tRes.value.data.data);
    } catch {
      toast.error(t("campaign.loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const referralCode = user?.referralCode || status?.code || "";
  const rewardPerReferral = status?.rewardPerReferral || 200;
  const minWithdrawal = status?.wallet?.minWithdrawal || 1000;

  async function copyLink() {
    if (!referralCode) {
      toast.error(t("campaign.notLoadedYet"));
      return;
    }
    const link = `${APP_URL}/signup?ref=${referralCode}`;
    try {
      await Clipboard.setStringAsync(link);
      setCopied(true);
      toast.success(t("campaign.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("campaign.copyFailed"));
    }
  }

  async function shareWhatsApp() {
    if (!referralCode) {
      toast.error(t("campaign.notLoadedYet"));
      return;
    }
    const link = `${APP_URL}/signup?ref=${referralCode}`;
    const msg = t("campaign.shareWaMsg", {
      code: referralCode,
      reward: rewardPerReferral,
      link,
    });
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    const can = await Linking.canOpenURL(url).catch(() => false);
    if (can) Linking.openURL(url).catch(() => {});
    else Share.share({ message: msg, url: link }).catch(() => {});
  }

  async function shareTwitter() {
    if (!referralCode) {
      toast.error(t("campaign.notLoadedYet"));
      return;
    }
    const msg = t("campaign.shareXMsg", { code: referralCode });
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {});
  }

  async function handleSubmit() {
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const res = await client.post("/campaign/submit");
      toast.success(res.data?.message || t("campaign.submitSuccess"));
      await loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("campaign.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function reportFollow(platform, picked) {
    if (!picked) {
      toast.error(t("campaign.social.needScreenshot"));
      return;
    }
    setReporting(platform);
    try {
      const fd = new FormData();
      fd.append("platform", platform);
      fd.append("screenshot", {
        uri: picked.uri,
        name: picked.name,
        type: picked.type,
      });
      const res = await client.post("/campaign/my-tasks/social", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(
        res.data.data?.allDone
          ? t("campaign.social.allDone")
          : t("campaign.social.recorded", { platform }),
      );
      await loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("campaign.social.fail"));
    } finally {
      setReporting(null);
    }
  }

  const readyCount = status?.stats?.readyToSubmit || 0;
  const alreadySubmitted = status?.alreadySubmittedToday;
  const hasMyTasks = myTasks?.hasCampaignReferral;
  const walletBal = status?.wallet?.balance || 0;
  const pendingRefs = referrals.filter((r) => r.status === "PENDING");
  const readyRefs = referrals.filter((r) => r.status === "TASKS_DONE");

  const allReadyHaveProfile = readyRefs.every(
    (r) => r.tasks?.hasSetupProfile === true,
  );
  const canSubmit =
    readyCount > 0 && !alreadySubmitted && !submitting && allReadyHaveProfile;

  const TABS = [
    {
      key: "earn",
      label: t("campaign.tab.earn"),
      iconName: "cash-outline",
    },
    ...(hasMyTasks
      ? [
          {
            key: "tasks",
            label: t("campaign.tab.tasks"),
            iconName: "checkmark-done-outline",
          },
        ]
      : []),
    {
      key: "history",
      label: t("campaign.tab.history"),
      iconName: "document-text-outline",
    },
  ];

  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
      >
        <Skeleton height={20} c={c} style={{ width: "40%" }} />
        <Skeleton height={36} c={c} style={{ width: "70%", marginTop: 8 }} />
        <Skeleton height={16} c={c} style={{ marginTop: 8 }} />
        <Skeleton height={140} c={c} style={{ marginTop: 18 }} />
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Skeleton height={78} c={c} />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton height={78} c={c} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Skeleton height={78} c={c} />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton height={78} c={c} />
          </View>
        </View>
        <Skeleton height={90} c={c} />
        <Skeleton height={70} c={c} style={{ marginTop: 12 }} />
        <Skeleton height={70} c={c} />
        <Skeleton height={70} c={c} />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAll();
            }}
            tintColor={c.orange}
          />
        }
      >
        {/* ── Header ── */}
        <View style={{ marginBottom: 18 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <View style={{ flex: 1, minWidth: 220 }}>
              <AppText
                style={{
                  fontSize: 10,
                  color: c.orange,
                  fontWeight: "700",
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                {t("campaign.eyebrow")}
              </AppText>
              <AppText
                weight="displayBlack"
                style={{
                  fontSize: 30,
                  lineHeight: 36,
                  color: c.text,
                  letterSpacing: -0.5,
                  marginVertical: 4,
                }}
              >
                {t("campaign.title")}
              </AppText>
              <AppText variant="body" tone="dim" style={{ lineHeight: 20 }}>
                {t("campaign.subtitlePrefix")}{" "}
                <AppText
                  weight="semibold"
                  style={{ color: c.orange, fontWeight: "800" }}
                >
                  ₦{rewardPerReferral}
                </AppText>{" "}
                {t("campaign.subtitleSuffix")}
              </AppText>
            </View>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: "rgba(249,115,22,0.12)",
                borderWidth: 1.5,
                borderColor: "rgba(249,115,22,0.35)",
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ionicons name="cash" size={13} color={c.orange} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: c.orange,
                  letterSpacing: 0.2,
                }}
              >
                ₦{rewardPerReferral} {t("campaign.perReferral")}
              </AppText>
            </View>
          </View>
        </View>

        {/* ── Wallet Card ── */}
        <Card
          padded
          style={{
            marginBottom: 10,
            borderWidth: 1.5,
            borderColor: "rgba(34,197,94,0.25)",
            backgroundColor: "rgba(34,197,94,0.05)",
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              fontWeight: "700",
              letterSpacing: 0.9,
              textTransform: "uppercase",
            }}
          >
            {t("campaign.wallet.label")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 38,
              lineHeight: 44,
              color: "#22c55e",
              letterSpacing: -1,
              marginTop: 4,
            }}
          >
            {fmtAmt(walletBal)}
          </AppText>
          <AppText variant="small" tone="dim" style={{ marginBottom: 14 }}>
            {t("campaign.wallet.lifetime")}:{" "}
            {fmtAmt(status?.wallet?.lifetimeTotal)}
          </AppText>
          <Pressable
            onPress={() => status?.wallet?.canWithdraw && setShowWd(true)}
            disabled={!status?.wallet?.canWithdraw}
            style={{
              paddingVertical: 11,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
              backgroundColor: status?.wallet?.canWithdraw
                ? "#22c55e"
                : c.bgCard,
              borderWidth: status?.wallet?.canWithdraw ? 0 : 1,
              borderColor: c.border,
            }}
          >
            <Ionicons
              name="card-outline"
              size={14}
              color={status?.wallet?.canWithdraw ? "#000" : c.textMuted}
            />
            <AppText
              weight="semibold"
              style={{
                fontSize: 14,
                color: status?.wallet?.canWithdraw ? "#000" : c.textMuted,
              }}
            >
              {t("campaign.wallet.withdraw")}
            </AppText>
          </Pressable>
          {!status?.wallet?.canWithdraw && (
            <AppText
              variant="small"
              tone="dim"
              style={{ textAlign: "center", marginTop: 6 }}
            >
              {t("campaign.wallet.needMin", {
                min: fmtAmt(minWithdrawal),
                have: fmtAmt(walletBal),
              })}
            </AppText>
          )}
        </Card>

        {/* ── Stats Grid 2×2 ── */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <StatCard
            iconName="people-outline"
            label={t("campaign.stats.totalReferred")}
            value={String(status?.stats?.totalReferred ?? 0)}
            c={c}
          />
          <StatCard
            iconName="checkmark-circle-outline"
            label={t("campaign.stats.readyToday")}
            value={String(readyCount)}
            accent={readyCount > 0 ? "green" : ""}
            c={c}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <StatCard
            iconName="time-outline"
            label={t("campaign.stats.tasksPending")}
            value={String(status?.stats?.pendingTasks ?? 0)}
            c={c}
          />
          <StatCard
            iconName="cash-outline"
            label={t("campaign.stats.totalEarned")}
            value={fmtAmt(status?.stats?.totalEarnings)}
            accent="orange"
            c={c}
          />
        </View>

        {/* ── Submit Banner ── */}
        <Card
          padded
          style={{
            marginBottom: 12,
            borderWidth: 1.5,
            borderColor: alreadySubmitted
              ? "rgba(34,197,94,0.35)"
              : readyCount > 0 && !allReadyHaveProfile
                ? "rgba(249,115,22,0.4)"
                : canSubmit
                  ? "rgba(249,115,22,0.6)"
                  : c.border,
            backgroundColor: alreadySubmitted
              ? "rgba(34,197,94,0.06)"
              : readyCount > 0
                ? "rgba(249,115,22,0.06)"
                : c.bgPanel,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Ionicons
              name={
                alreadySubmitted
                  ? "cloud-upload-outline"
                  : readyCount > 0 && !allReadyHaveProfile
                    ? "warning-outline"
                    : canSubmit
                      ? "flash"
                      : "time-outline"
              }
              size={26}
              color={
                alreadySubmitted
                  ? "#22c55e"
                  : readyCount > 0
                    ? c.orange
                    : c.textMuted
              }
              style={{ flexShrink: 0 }}
            />
            <View style={{ flex: 1, minWidth: 180 }}>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginBottom: 3 }}
              >
                {alreadySubmitted
                  ? t("campaign.banner.doneTitle")
                  : readyCount > 0 && !allReadyHaveProfile
                    ? t("campaign.banner.notQualifiedTitle", {
                        count: readyRefs.length,
                      })
                    : canSubmit
                      ? t("campaign.banner.readyTitle", {
                          count: readyCount,
                          amount: fmtAmt(readyCount * rewardPerReferral),
                        })
                      : pendingRefs.length > 0
                        ? t("campaign.banner.pendingTitle", {
                            count: pendingRefs.length,
                          })
                        : t("campaign.banner.idleTitle")}
              </AppText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <AppText
                  variant="small"
                  tone="dim"
                  style={{ lineHeight: 18, flexShrink: 1 }}
                >
                  {alreadySubmitted
                    ? t("campaign.banner.doneSub", {
                        count: status?.todaySubmission?.totalSubmitted ?? 0,
                      })
                    : readyCount > 0 && !allReadyHaveProfile
                      ? t("campaign.banner.notQualifiedSub")
                      : canSubmit
                        ? t("campaign.banner.readySub")
                        : pendingRefs.length > 0
                          ? t("campaign.banner.pendingSub")
                          : t("campaign.banner.idleSub", {
                              reward: rewardPerReferral,
                            })}
                </AppText>
                {alreadySubmitted && (
                  <Badge
                    status={status?.todaySubmission?.status}
                    meta={SUBMISSION_META}
                    t={t}
                    c={c}
                  />
                )}
              </View>
            </View>
            {canSubmit && (
              <Pressable
                onPress={() => setShowConfirm(true)}
                disabled={submitting}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  backgroundColor: c.orange,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <AppText
                      variant="body"
                      weight="semibold"
                      style={{ color: "#000" }}
                    >
                      {t("campaign.banner.submitNow")}
                    </AppText>
                    <Ionicons name="send" size={14} color="#000" />
                  </>
                )}
              </Pressable>
            )}
          </View>
        </Card>

        {/* ── Tabs ── */}
        <Card style={{ overflow: "hidden" }}>
          <View
            style={{
              flexDirection: "row",
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            {TABS.map((tItem) => (
              <Pressable
                key={tItem.key}
                onPress={() => setTab(tItem.key)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 5,
                  borderBottomWidth: 2,
                  borderBottomColor:
                    tab === tItem.key ? c.orange : "transparent",
                  backgroundColor:
                    tab === tItem.key ? "rgba(249,115,22,0.06)" : "transparent",
                }}
              >
                <Ionicons
                  name={tItem.iconName}
                  size={13}
                  color={tab === tItem.key ? c.orange : c.textMuted}
                />
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: tab === tItem.key ? "700" : "600",
                    color: tab === tItem.key ? c.orange : c.textMuted,
                  }}
                  numberOfLines={1}
                >
                  {tItem.label}
                </AppText>
              </Pressable>
            ))}
          </View>

          {/* ══════════ EARN TAB ══════════ */}
          {tab === "earn" && (
            <View style={{ padding: 16 }}>
              {/* Code Card */}
              <View
                style={[
                  ec.codeBox,
                  {
                    borderColor: "rgba(249,115,22,0.35)",
                    backgroundColor: "rgba(249,115,22,0.05)",
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    color: c.textMuted,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  {t("campaign.code.label")}
                </AppText>
                <AppText
                  weight="displayBlack"
                  style={{
                    fontSize: 30,
                    color: c.orange,
                    letterSpacing: 2,
                    marginBottom: 4,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {referralCode || "—"}
                </AppText>
                <AppText
                  variant="small"
                  tone="dim"
                  numberOfLines={1}
                  style={{
                    fontFamily: Platform.select({
                      ios: "Courier",
                      android: "monospace",
                    }),
                    marginBottom: 14,
                  }}
                >
                  {`${APP_URL}/signup?ref=${referralCode || ""}`}
                </AppText>
                <View
                  style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}
                >
                  <Pressable
                    onPress={copyLink}
                    disabled={!referralCode}
                    style={{
                      flex: 1,
                      paddingVertical: 11,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                      backgroundColor: copied ? "#22c55e" : c.orange,
                    }}
                  >
                    <Ionicons
                      name={copied ? "checkmark" : "copy-outline"}
                      size={14}
                      color="#000"
                    />
                    <AppText
                      variant="body"
                      weight="semibold"
                      style={{ color: "#000" }}
                    >
                      {copied
                        ? t("campaign.code.copied")
                        : t("campaign.code.copy")}
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Share.share({
                        message: t("campaign.code.shareMsg", {
                          code: referralCode,
                          reward: rewardPerReferral,
                          link: `${APP_URL}/signup?ref=${referralCode}`,
                        }),
                      }).catch(() => {})
                    }
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 11,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(249,115,22,0.4)",
                      backgroundColor: "rgba(249,115,22,0.08)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Ionicons name="share-outline" size={14} color={c.orange} />
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: c.orange }}
                    >
                      {t("campaign.code.share")}
                    </AppText>
                  </Pressable>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    paddingTop: 10,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: c.border,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ marginRight: 2 }}
                  >
                    {t("campaign.code.shareVia")}:
                  </AppText>
                  <Pressable
                    onPress={shareWhatsApp}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: "rgba(37,211,102,0.08)",
                      borderColor: "rgba(37,211,102,0.30)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={13} color="#25d366" />
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#25d366",
                      }}
                    >
                      {t("campaign.code.whatsapp")}
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={shareTwitter}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderColor: "rgba(231,233,234,0.20)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="logo-twitter" size={13} color="#e7e9ea" />
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#e7e9ea",
                      }}
                    >
                      {t("campaign.code.post")}
                    </AppText>
                  </Pressable>
                </View>
              </View>

              {/* How it works */}
              <Card padded style={{ marginTop: 12, marginBottom: 12 }}>
                <AppText
                  variant="small"
                  weight="semibold"
                  tone="dim"
                  style={{ letterSpacing: 0.8, marginBottom: 14 }}
                >
                  {t("campaign.how.title", {
                    reward: rewardPerReferral,
                  }).toUpperCase()}
                </AppText>
                {[
                  {
                    n: "1",
                    iconName: "link-outline",
                    text: t("campaign.how.s1"),
                  },
                  {
                    n: "2",
                    iconName: "phone-portrait-outline",
                    text: t("campaign.how.s2"),
                  },
                  {
                    n: "3",
                    iconName: "person-outline",
                    text: t("campaign.how.s3"),
                  },
                  {
                    n: "4",
                    iconName: "logo-instagram",
                    text: t("campaign.how.s4"),
                  },
                  {
                    n: "5",
                    iconName: "cloud-upload-outline",
                    text: t("campaign.how.s5", { reward: rewardPerReferral }),
                  },
                ].map((s, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 8,
                      borderBottomWidth: i < 4 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: c.border,
                    }}
                  >
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: c.orange,
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 12,
                          fontWeight: "900",
                          color: "#000",
                        }}
                      >
                        {s.n}
                      </AppText>
                    </View>
                    <Ionicons name={s.iconName} size={17} color={c.textDim} />
                    <AppText
                      variant="body"
                      tone="dim"
                      style={{ flex: 1, lineHeight: 20 }}
                    >
                      {s.text}
                    </AppText>
                  </View>
                ))}
              </Card>

              {/* Task legend */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 14,
                  paddingVertical: 4,
                }}
              >
                {TASKS.map((task) => (
                  <View
                    key={task.key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: task.color,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="checkmark"
                        size={9}
                        color={task.color === "#000000" ? "#fff" : "#fff"}
                      />
                    </View>
                    <AppText variant="small" tone="dim">
                      {t(task.labelKey)}
                    </AppText>
                  </View>
                ))}
              </View>

              {/* All referrals */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.text }}
                  >
                    {t("campaign.referrals.title")}
                  </AppText>
                  {referrals.length > 0 && (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor: c.bgCard,
                        borderWidth: 1,
                        borderColor: c.border,
                      }}
                    >
                      <AppText variant="small" tone="dim">
                        {referrals.length}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>

              {referrals.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <Ionicons
                    name="people-outline"
                    size={36}
                    color={c.textMuted}
                    style={{ marginBottom: 10, opacity: 0.5 }}
                  />
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{
                      color: c.text,
                      marginBottom: 4,
                      textAlign: "center",
                    }}
                  >
                    {t("campaign.referrals.empty")}
                  </AppText>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ textAlign: "center" }}
                  >
                    {t("campaign.referrals.emptySub")}
                  </AppText>
                </View>
              ) : (
                referrals.map((r) => {
                  const rs = REFERRAL_META[r.status] || REFERRAL_META.PENDING;
                  return (
                    <View
                      key={r.id}
                      style={[
                        ec.refRow,
                        {
                          borderColor: c.border,
                          backgroundColor: c.bgCard,
                        },
                      ]}
                    >
                      <Avatar name={r.name} avatar={r.avatar} c={c} />
                      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                        <AppText
                          variant="body"
                          weight="semibold"
                          style={{ color: c.text }}
                          numberOfLines={1}
                        >
                          {r.name}
                        </AppText>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 2,
                            flexWrap: "wrap",
                          }}
                        >
                          <View
                            style={{
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 20,
                              backgroundColor:
                                r.role === "WORKER"
                                  ? "rgba(249,115,22,0.12)"
                                  : "rgba(129,140,248,0.12)",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <Ionicons
                              name={
                                r.role === "WORKER"
                                  ? "construct-outline"
                                  : "person-outline"
                              }
                              size={9}
                              color={r.role === "WORKER" ? c.orange : "#818cf8"}
                            />
                            <AppText
                              style={{
                                fontSize: 9,
                                fontWeight: "700",
                                color:
                                  r.role === "WORKER" ? c.orange : "#818cf8",
                              }}
                            >
                              {r.role === "WORKER"
                                ? t("campaign.role.worker").toUpperCase()
                                : t("campaign.role.hirer").toUpperCase()}
                            </AppText>
                          </View>
                          <AppText variant="small" tone="dim">
                            · {timeAgo(r.joinedAt, t)}
                          </AppText>
                        </View>
                        <TaskPips tasks={TASKS} r={r} t={t} c={c} />
                        {r.referralProgram && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <ReferralProgramBadge
                              status={r.referralProgram.status}
                              t={t}
                              c={c}
                            />
                            {r.referralProgram.bonus > 0 && (
                              <AppText
                                variant="small"
                                tone="dim"
                                style={{ fontSize: 10 }}
                              >
                                {fmtAmt(r.referralProgram.bonus)}{" "}
                                {t("campaign.referrals.bonus")}
                              </AppText>
                            )}
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Badge
                          status={r.status}
                          meta={REFERRAL_META}
                          t={t}
                          c={c}
                        />
                        {r.status === "APPROVED" && (
                          <AppText
                            weight="semibold"
                            style={{ fontSize: 13, color: "#22c55e" }}
                          >
                            +{fmtAmt(r.rewardAmount)}
                          </AppText>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ══════════ MY TASKS TAB ══════════ */}
          {tab === "tasks" && (
            <View style={{ padding: 16 }}>
              {!hasMyTasks ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <Ionicons
                    name="information-circle-outline"
                    size={30}
                    color={c.textMuted}
                    style={{ marginBottom: 10, opacity: 0.5 }}
                  />
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{
                      color: c.text,
                      marginBottom: 4,
                      textAlign: "center",
                    }}
                  >
                    {t("campaign.myTasks.emptyTitle")}
                  </AppText>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ textAlign: "center" }}
                  >
                    {t("campaign.myTasks.emptySub")}
                  </AppText>
                </View>
              ) : (
                <>
                  <View style={{ marginBottom: 16 }}>
                    <View
                      style={{
                        height: 8,
                        borderRadius: 4,
                        overflow: "hidden",
                        backgroundColor: c.bgCard,
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: c.orange,
                          width: `${
                            (myTasks.completedCount / myTasks.totalCount) * 100
                          }%`,
                          minWidth: 4,
                        }}
                      />
                    </View>
                    <AppText
                      variant="body"
                      weight="semibold"
                      style={{ color: c.text }}
                    >
                      {t("campaign.myTasks.progress", {
                        done: myTasks.completedCount,
                        total: myTasks.totalCount,
                      })}
                    </AppText>
                  </View>

                  {myTasks.allDone && (
                    <View
                      style={{
                        backgroundColor: "rgba(34,197,94,0.10)",
                        borderWidth: 1,
                        borderColor: "rgba(34,197,94,0.3)",
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 14,
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#22c55e"
                        style={{ marginTop: 1 }}
                      />
                      <AppText
                        variant="small"
                        weight="semibold"
                        style={{ color: "#22c55e", flex: 1 }}
                      >
                        {t("campaign.myTasks.allDone", {
                          reward: rewardPerReferral,
                        })}
                      </AppText>
                    </View>
                  )}

                  {myTasks.tasks
                    ?.filter((task) => task.auto)
                    .map((task) => (
                      <View
                        key={task.key}
                        style={[
                          ec.autoRow,
                          {
                            borderColor: task.done
                              ? "rgba(34,197,94,0.25)"
                              : c.border,
                            backgroundColor: task.done
                              ? "rgba(34,197,94,0.06)"
                              : c.bgCard,
                          },
                        ]}
                      >
                        <Ionicons
                          name={task.done ? "checkmark-circle" : "time-outline"}
                          size={22}
                          color={task.done ? "#22c55e" : c.textMuted}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <AppText
                            variant="body"
                            weight="semibold"
                            style={{ color: c.text }}
                          >
                            {task.label}
                          </AppText>
                          {task.hint && (
                            <AppText variant="small" tone="dim">
                              {task.hint}
                            </AppText>
                          )}
                        </View>
                        {task.done && (
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 20,
                              backgroundColor: "rgba(34,197,94,0.15)",
                              borderWidth: 1,
                              borderColor: "rgba(34,197,94,0.4)",
                            }}
                          >
                            <AppText
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: "#22c55e",
                              }}
                            >
                              {t("campaign.myTasks.done")}
                            </AppText>
                          </View>
                        )}
                      </View>
                    ))}

                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.text, marginTop: 16, marginBottom: 10 }}
                  >
                    {t("campaign.myTasks.socialTitle")}
                  </AppText>
                  {myTasks.tasks
                    ?.filter((task) => !task.auto)
                    .map((task) => {
                      const taskMeta = TASKS.find((tk) => tk.key === task.key);
                      const platformKey = task.key
                        ?.replace("hasFollowed", "")
                        .toLowerCase();
                      const link = myTasks.social?.[platformKey] || "#";
                      return taskMeta ? (
                        <SocialCard
                          key={task.key}
                          task={taskMeta}
                          done={task.done}
                          onReport={reportFollow}
                          reporting={reporting}
                          link={link}
                          screenshotUrl={task.proofUrl}
                          onError={(msg) => toast.error(msg)}
                          onViewScreenshot={(src, alt) =>
                            setLightbox({ src, alt })
                          }
                          t={t}
                          c={c}
                        />
                      ) : null;
                    })}

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      marginTop: 12,
                      paddingHorizontal: 8,
                    }}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={12}
                      color={c.textMuted}
                    />
                    <AppText
                      variant="small"
                      tone="dim"
                      style={{ lineHeight: 16, textAlign: "center", flex: 1 }}
                    >
                      {t("campaign.myTasks.screenshotNote")}
                    </AppText>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ══════════ HISTORY TAB ══════════ */}
          {tab === "history" && (
            <View style={{ padding: 16 }}>
              {submissions.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <Ionicons
                    name="document-text-outline"
                    size={36}
                    color={c.textMuted}
                    style={{ marginBottom: 10, opacity: 0.5 }}
                  />
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{
                      color: c.text,
                      marginBottom: 4,
                      textAlign: "center",
                    }}
                  >
                    {t("campaign.history.empty")}
                  </AppText>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ textAlign: "center" }}
                  >
                    {t("campaign.history.emptySub")}
                  </AppText>
                </View>
              ) : (
                submissions.map((sub) => (
                  <SubmissionCard key={sub.id} sub={sub} t={t} c={c} />
                ))
              )}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* ── Confirm Submit Modal ── */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: modalBg,
              borderRadius: 20,
              padding: 20,
            }}
          >
            <AppText
              weight="displayBlack"
              style={{ fontSize: 20, color: c.text, marginBottom: 12 }}
            >
              {t("campaign.confirm.title", { count: readyCount })}
            </AppText>
            <AppText
              variant="body"
              tone="dim"
              style={{ marginBottom: 8, lineHeight: 20 }}
            >
              {t("campaign.confirm.body1Prefix")}{" "}
              <AppText weight="semibold" style={{ color: c.text }}>
                {readyCount}
              </AppText>{" "}
              {t("campaign.confirm.body1Suffix", { count: readyCount })}
            </AppText>
            <AppText
              variant="body"
              tone="dim"
              style={{ marginBottom: 14, lineHeight: 20 }}
            >
              {t("campaign.confirm.body2Prefix")}{" "}
              <AppText weight="semibold" style={{ color: c.orange }}>
                {fmtAmt(readyCount * rewardPerReferral)}
              </AppText>
              .
            </AppText>
            <View
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.20)",
                borderRadius: 10,
                padding: 10,
                marginBottom: 18,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 6,
              }}
            >
              <Ionicons
                name="warning-outline"
                size={14}
                color={c.orange}
                style={{ marginTop: 1 }}
              />
              <AppText
                variant="small"
                tone="dim"
                style={{ flex: 1, lineHeight: 16 }}
              >
                {t("campaign.confirm.note")}
              </AppText>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.bgCard,
                  alignItems: "center",
                }}
              >
                <AppText variant="body" weight="semibold" tone="dim">
                  {t("common.cancel")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: c.orange,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: "#000" }}
                  >
                    {t("campaign.confirm.submit")}
                  </AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Withdraw Modal ── */}
      <WithdrawModal
        visible={showWd}
        balance={walletBal}
        minWithdrawal={minWithdrawal}
        onClose={() => setShowWd(false)}
        onSuccess={loadAll}
        c={c}
        modalBg={modalBg}
        t={t}
        toast={toast}
      />

      {/* ── Lightbox ── */}
      {lightbox && (
        <FullscreenImage
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const a = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});

const st = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 1,
    padding: 12,
    minHeight: 78,
  },
});

const sf = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  doneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chooseBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  previewImg: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.2)",
  },
  previewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  markBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

const sk = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  expanded: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  adminNote: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

const wm = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "92%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  balRow: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  amtRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    height: 54,
    overflow: "hidden",
    marginBottom: 10,
  },
  curBadge: {
    paddingHorizontal: 14,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(128,128,128,0.2)",
  },
  pctRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  pctBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});

const ec = StyleSheet.create({
  codeBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 4,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 8,
  },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
