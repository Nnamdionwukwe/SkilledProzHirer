// src/screens/main/ReferralDashboardScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Verbatim mirror of the website's /referral/dashboard page
// (src/pages/referral/ReferralDashboard.jsx). All visuals use Ionicons.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Modal,
  Share,
  Linking,
  StyleSheet,
  Platform,
  useWindowDimensions,
  RefreshControl,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
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
const PROD_DOMAIN = "https://skilledproz.com";
const buildRefLink = (code) => `${PROD_DOMAIN}/signup?ref=${code || ""}`;

const TIER_STYLES = {
  BRONZE: {
    color: "#cd7f32",
    bg: "rgba(205,127,50,0.12)",
    border: "rgba(205,127,50,0.30)",
    iconName: "medal-outline",
  },
  SILVER: {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.30)",
    iconName: "medal-outline",
  },
  GOLD: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.30)",
    iconName: "medal",
  },
  DIAMOND: {
    color: "#67e8f9",
    bg: "rgba(103,232,249,0.12)",
    border: "rgba(103,232,249,0.30)",
    iconName: "diamond-outline",
  },
};

const STATUS_META = {
  PENDING: { labelKey: "referral.status.pending", cls: "yellow" },
  QUALIFIED: { labelKey: "referral.status.qualified", cls: "indigo" },
  CONVERTED: { labelKey: "referral.status.converted", cls: "blue" },
  REWARDED: { labelKey: "referral.status.rewarded", cls: "green" },
  EXPIRED: { labelKey: "referral.status.expired", cls: "dim" },
  FLAGGED: { labelKey: "referral.status.flagged", cls: "red" },
};

const CAMPAIGN_STATUS_META = {
  PENDING: { labelKey: "referral.campStatus.inProgress", cls: "yellow" },
  TASKS_DONE: { labelKey: "referral.campStatus.ready", cls: "green" },
  SUBMITTED: { labelKey: "referral.campStatus.submitted", cls: "indigo" },
  APPROVED: { labelKey: "referral.campStatus.paid", cls: "green" },
  REJECTED: { labelKey: "referral.campStatus.rejected", cls: "red" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtAmt = (n) =>
  `₦${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const timeAgo = (d, t) => {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return t("referral.today");
  if (days === 1) return t("referral.yesterday");
  return `${days}${t("referral.daysAgoSuffix")}`;
};

function statusColors(cls, c) {
  switch (cls) {
    case "yellow":
      return {
        color: "#eab308",
        bg: "rgba(234,179,8,0.12)",
        border: "rgba(234,179,8,0.30)",
      };
    case "indigo":
      return {
        color: "#818cf8",
        bg: "rgba(129,140,248,0.12)",
        border: "rgba(129,140,248,0.30)",
      };
    case "blue":
      return {
        color: "#60a5fa",
        bg: "rgba(59,130,246,0.10)",
        border: "rgba(59,130,246,0.28)",
      };
    case "green":
      return {
        color: "#22c55e",
        bg: "rgba(34,197,94,0.12)",
        border: "rgba(34,197,94,0.30)",
      };
    case "red":
      return {
        color: "#ef4444",
        bg: "rgba(239,68,68,0.12)",
        border: "rgba(239,68,68,0.28)",
      };
    case "dim":
    default:
      return { color: c.textMuted, bg: c.bgCard, border: c.border };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON (shimmer)
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ height = 16, width = "100%", radius = 8, c, style }) {
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
          width,
          borderRadius: radius,
          backgroundColor: bg,
        },
        style,
      ]}
    />
  );
}

// Full-page skeleton that mirrors the real layout
function PageSkeleton({ c }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Skeleton height={10} width={90} c={c} style={{ marginBottom: 8 }} />
      <Skeleton height={26} width="60%" c={c} style={{ marginBottom: 8 }} />
      <Skeleton height={14} width="90%" c={c} style={{ marginBottom: 4 }} />
      <Skeleton height={14} width="70%" c={c} style={{ marginBottom: 16 }} />

      {/* Code card */}
      <View
        style={{
          borderWidth: 1.5,
          borderColor: "rgba(249,115,22,0.20)",
          backgroundColor: "rgba(249,115,22,0.03)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <Skeleton height={10} width={100} c={c} style={{ marginBottom: 8 }} />
        <Skeleton height={26} width="55%" c={c} style={{ marginBottom: 8 }} />
        <Skeleton height={11} width="85%" c={c} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          <Skeleton height={40} c={c} style={{ flex: 1 }} />
          <Skeleton height={40} width={90} c={c} />
        </View>
        <Skeleton height={1} width="100%" c={c} style={{ marginBottom: 12 }} />
        <Skeleton height={10} width={70} c={c} style={{ marginBottom: 8 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Skeleton height={30} width={100} c={c} />
          <Skeleton height={30} width={80} c={c} />
        </View>
      </View>

      {/* Stats 2×2 */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <Skeleton height={88} c={c} style={{ flex: 1 }} radius={12} />
        <Skeleton height={88} c={c} style={{ flex: 1 }} radius={12} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <Skeleton height={88} c={c} style={{ flex: 1 }} radius={12} />
        <Skeleton height={88} c={c} style={{ flex: 1 }} radius={12} />
      </View>

      {/* Tier card */}
      <View
        style={{
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bgPanel,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Skeleton height={10} width={60} c={c} />
          <Skeleton height={20} width={80} c={c} radius={20} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <Skeleton height={32} width={32} c={c} radius={16} />
          <View style={{ flex: 1 }}>
            <Skeleton
              height={16}
              width="50%"
              c={c}
              style={{ marginBottom: 6 }}
            />
            <Skeleton height={11} width="70%" c={c} />
          </View>
        </View>
        <Skeleton height={6} c={c} style={{ marginBottom: 8 }} radius={3} />
        <Skeleton height={10} width="80%" c={c} style={{ marginBottom: 16 }} />
        <Skeleton height={44} c={c} radius={12} style={{ marginBottom: 8 }} />
        <Skeleton height={44} c={c} radius={12} />
      </View>

      {/* Wallet card */}
      <View
        style={{
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bgPanel,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Skeleton height={10} width={110} c={c} />
          <Skeleton height={20} width={60} c={c} radius={6} />
        </View>
        <Skeleton height={10} width={110} c={c} style={{ marginBottom: 8 }} />
        <Skeleton height={28} width="45%" c={c} style={{ marginBottom: 6 }} />
        <Skeleton height={11} width="70%" c={c} style={{ marginBottom: 16 }} />
        <Skeleton height={40} c={c} radius={10} style={{ marginBottom: 4 }} />
      </View>

      {/* How it works */}
      <View
        style={{
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bgPanel,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <Skeleton height={10} width={110} c={c} style={{ marginBottom: 14 }} />
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
              paddingVertical: 12,
              borderBottomWidth: i < 4 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: c.border,
            }}
          >
            <Skeleton height={36} width={36} c={c} radius={10} />
            <View style={{ flex: 1 }}>
              <Skeleton
                height={9}
                width={50}
                c={c}
                style={{ marginBottom: 6 }}
              />
              <Skeleton
                height={14}
                width="60%"
                c={c}
                style={{ marginBottom: 6 }}
              />
              <Skeleton height={11} c={c} style={{ marginBottom: 3 }} />
              <Skeleton height={11} width="70%" c={c} />
            </View>
          </View>
        ))}
      </View>

      {/* Perks row */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <View
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.bgPanel,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Skeleton height={10} width="70%" c={c} style={{ marginBottom: 8 }} />
          <Skeleton height={11} c={c} style={{ marginBottom: 4 }} />
          <Skeleton height={11} width="80%" c={c} />
        </View>
        <View
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.bgPanel,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Skeleton height={10} width="70%" c={c} style={{ marginBottom: 8 }} />
          <Skeleton height={11} c={c} style={{ marginBottom: 4 }} />
          <Skeleton height={11} width="80%" c={c} />
        </View>
      </View>

      {/* Tabs skeleton */}
      <View
        style={{
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bgPanel,
          borderRadius: 16,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Skeleton height={30} c={c} style={{ flex: 1 }} radius={8} />
          <Skeleton height={30} c={c} style={{ flex: 1 }} radius={8} />
        </View>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <Skeleton height={36} width={36} c={c} radius={18} />
            <View style={{ flex: 1 }}>
              <Skeleton
                height={14}
                width="50%"
                c={c}
                style={{ marginBottom: 6 }}
              />
              <Skeleton height={10} width="70%" c={c} />
            </View>
            <Skeleton height={20} width={60} c={c} radius={20} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function TierBadge({ tier, t, c }) {
  const s = TIER_STYLES[tier] || TIER_STYLES.BRONZE;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: s.bg,
        borderColor: s.border,
        alignSelf: "flex-start",
      }}
    >
      <Ionicons name={s.iconName} size={11} color={s.color} />
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0.3,
          color: s.color,
          marginLeft: 4,
        }}
      >
        {t(`referral.tier.${tier.toLowerCase()}`).toUpperCase()}
      </AppText>
    </View>
  );
}

function StatusBadge({ status, t, c }) {
  const m = STATUS_META[status] || { labelKey: null, cls: "dim" };
  const label = m.labelKey ? t(m.labelKey) : status;
  const col = statusColors(m.cls, c);
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: col.bg,
        borderColor: col.border,
      }}
    >
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: col.color,
          letterSpacing: 0.3,
        }}
      >
        {String(label).toUpperCase()}
      </AppText>
    </View>
  );
}

function CampaignBadge({ status, t, c }) {
  if (!status) return null;
  const m = CAMPAIGN_STATUS_META[status] || { labelKey: null, cls: "dim" };
  const label = m.labelKey ? t(m.labelKey) : status;
  const col = statusColors(m.cls, c);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: col.bg,
        borderColor: col.border,
      }}
    >
      <Ionicons
        name="locate-outline"
        size={10}
        color={col.color}
        style={{ marginRight: 3 }}
      />
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: col.color,
          letterSpacing: 0.3,
        }}
      >
        {String(label).toUpperCase()}
      </AppText>
    </View>
  );
}

function Avatar({ name, avatar, size = 36, c }) {
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
        <Image
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <AppText
          style={{ fontSize: size * 0.33, color: c.orange, fontWeight: "700" }}
        >
          {initials}
        </AppText>
      )}
    </View>
  );
}

function StatCard({ iconName, label, value, sub, accent, c }) {
  const bg =
    accent === "green"
      ? "rgba(34,197,94,0.10)"
      : accent === "orange"
        ? "rgba(249,115,22,0.10)"
        : c.bgPanel;
  const bd =
    accent === "green"
      ? "rgba(34,197,94,0.28)"
      : accent === "orange"
        ? "rgba(249,115,22,0.30)"
        : c.border;
  const valColor =
    accent === "green" ? "#22c55e" : accent === "orange" ? c.orange : c.text;
  const iconColor =
    accent === "green" ? "#22c55e" : accent === "orange" ? c.orange : c.textDim;
  return (
    <View style={[sc.card, { backgroundColor: bg, borderColor: bd }]}>
      <Ionicons name={iconName} size={15} color={iconColor} />
      <AppText
        weight="displayBlack"
        style={{ fontSize: 18, lineHeight: 22, color: valColor, marginTop: 3 }}
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
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginTop: 2,
        }}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {sub ? (
        <AppText style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 88,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAW MODAL
// ─────────────────────────────────────────────────────────────────────────────
function WithdrawModal({
  visible,
  wallet,
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

  const avail = wallet?.balance ?? 0;
  const minWd = wallet?.minWithdrawal ?? 5000;

  function setF(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setPinNotSet(false);
  }
  const setPercent = (pct) =>
    setF("amount", (pct === 1 ? avail : avail * pct).toFixed(0));

  async function submit() {
    const numAmt = parseFloat(form.amount);
    if (!numAmt || numAmt < minWd) {
      toast.error(t("referral.withdraw.minError", { min: fmtAmt(minWd) }));
      return;
    }
    if (numAmt > avail) {
      toast.error(
        t("referral.withdraw.insufficient", { balance: fmtAmt(avail) }),
      );
      return;
    }
    if (!form.bankName || !form.accountNumber || !form.accountName) {
      toast.error(t("referral.withdraw.bankRequired"));
      return;
    }
    if (!form.pin || form.pin.length !== 4) {
      toast.error(t("referral.withdraw.pinRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await client.post("/referral/withdraw", {
        amount: form.amount,
        pin: form.pin,
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
      });
      toast.success(t("referral.withdraw.success"));
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
      const msg = err?.response?.data?.message || t("referral.withdraw.failed");
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
                <Ionicons name="card-outline" size={17} color="#22c55e" />
                <AppText
                  weight="displayBlack"
                  style={{ fontSize: 17, color: c.text }}
                >
                  {t("referral.withdraw.title")}
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
                    {t("referral.withdraw.available").toUpperCase()}
                  </AppText>
                  <AppText
                    weight="displayBlack"
                    style={{ color: "#22c55e", fontSize: 20, marginTop: 2 }}
                  >
                    {fmtAmt(avail)}
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
                    {t("referral.withdraw.min").toUpperCase()}
                  </AppText>
                  <AppText
                    weight="semibold"
                    style={{ color: c.textMuted, fontSize: 14, marginTop: 2 }}
                  >
                    {fmtAmt(minWd)}
                  </AppText>
                </View>
              </View>

              <AppText style={[wm.sectionLabel, { color: c.textMuted }]}>
                {t("referral.withdraw.amount")} *
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
                  placeholder={`Min ${fmtAmt(minWd)}`}
                  placeholderTextColor={c.textMuted}
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    color: c.text,
                    fontSize: 17,
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
                      {p === 1 ? t("referral.withdraw.max") : `${p * 100}%`}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <AppText style={[wm.sectionLabel, { color: c.textMuted }]}>
                {t("referral.withdraw.bankSection").toUpperCase()}
              </AppText>
              {[
                {
                  k: "bankName",
                  label: t("referral.withdraw.bankName"),
                  kb: "default",
                  ph: t("referral.withdraw.bankNamePh"),
                },
                {
                  k: "accountNumber",
                  label: t("referral.withdraw.accountNumber"),
                  kb: "numeric",
                  ph: t("referral.withdraw.accountNumberPh"),
                  max: 10,
                },
                {
                  k: "accountName",
                  label: t("referral.withdraw.accountName"),
                  kb: "default",
                  ph: t("referral.withdraw.accountNamePh"),
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
                {t("referral.withdraw.pin")} *
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
                    fontSize: 18,
                    fontWeight: "700",
                  },
                ]}
              />
              <AppText
                variant="small"
                tone="dim"
                style={{ marginTop: 4, marginBottom: 12, lineHeight: 16 }}
              >
                {t("referral.withdraw.pinHint")}
              </AppText>

              {pinNotSet && (
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `${PROD_DOMAIN}/settings?tab=security`,
                    ).catch(() => {})
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
                    style={{ color: c.orange, textDecorationLine: "underline" }}
                  >
                    {t("referral.withdraw.setPin")}
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
                    {t("referral.withdraw.submit")}
                  </AppText>
                )}
              </Pressable>
              <AppText
                variant="small"
                tone="dim"
                style={{ textAlign: "center", marginTop: 8, marginBottom: 32 }}
              >
                {t("referral.withdraw.note")}
              </AppText>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    height: 52,
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
  pctRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pctBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function ReferralDashboardScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const c = th.colors;
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";

  const [dashboard, setDashboard] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("referrals");
  const [showWd, setShowWd] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await client.get("/referral/dashboard");
      setDashboard(res.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("referral.loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Lazy-load leaderboard when tab selected
  useEffect(() => {
    if (tab !== "leaderboard" || leaderboard) return;
    client
      .get("/referral/leaderboard?limit=20")
      .then((r) => setLeaderboard(r.data.data))
      .catch(() => {});
  }, [tab, leaderboard]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const referralCode = dashboard?.code || user?.referralCode || "";
  const refLink = buildRefLink(referralCode);

  async function copyLink() {
    if (!referralCode) {
      toast.error(t("referral.notLoadedYet"));
      return;
    }
    try {
      await Clipboard.setStringAsync(refLink);
      setCopied(true);
      toast.success(t("referral.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("referral.copyFailed"));
    }
  }

  async function shareLink() {
    const shareText = t("referral.shareMsg", {
      code: referralCode,
      link: refLink,
    });
    try {
      await Share.share({ message: shareText, url: refLink });
    } catch {}
  }

  const openWA = () => {
    const text = encodeURIComponent(
      t("referral.shareMsg", { code: referralCode, link: refLink }),
    );
    Linking.openURL(`whatsapp://send?text=${text}`).catch(() =>
      Linking.openURL(`https://wa.me/?text=${text}`),
    );
  };
  const openX = () => {
    const text = encodeURIComponent(
      t("referral.shareMsg", { code: referralCode, link: refLink }),
    );
    Linking.openURL(`https://twitter.com/intent/tweet?text=${text}`);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const d = dashboard;
  const tier = d?.tier;
  const ts = tier
    ? TIER_STYLES[tier.key] || TIER_STYLES.BRONZE
    : TIER_STYLES.BRONZE;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return <PageSkeleton c={c} />;
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
              load();
            }}
            tintColor={c.orange}
          />
        }
      >
        {/* ── Page Header ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 16,
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
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {t("referral.eyebrow")}
            </AppText>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 26,
                lineHeight: 32,
                color: c.text,
                letterSpacing: -0.4,
                marginVertical: 4,
              }}
            >
              {t("referral.title")}
            </AppText>
            <AppText variant="body" tone="dim" style={{ lineHeight: 20 }}>
              {t("referral.subtitle")}
            </AppText>
          </View>
          {d?.leaderboardRank && (
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: "rgba(249,115,22,0.12)",
                borderWidth: 1,
                borderColor: "rgba(249,115,22,0.35)",
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Ionicons name="medal-outline" size={12} color={c.orange} />
              <AppText
                style={{ fontSize: 12, fontWeight: "700", color: c.orange }}
              >
                {t("referral.rank")} #{d.leaderboardRank}
              </AppText>
            </View>
          )}
        </View>

        {/* ── Code Card ── */}
        <Card
          padded
          style={{
            marginBottom: 12,
            borderWidth: 1.5,
            borderColor: "rgba(249,115,22,0.30)",
            backgroundColor: "rgba(249,115,22,0.04)",
          }}
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
            {t("referral.code.label")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 26,
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
            {refLink || t("referral.loading")}
          </AppText>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
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
                {copied ? t("referral.code.copied") : t("referral.code.copy")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={shareLink}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 11,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "rgba(249,115,22,0.35)",
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
                {t("referral.code.share")}
              </AppText>
            </Pressable>
          </View>

          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: c.border,
              paddingTop: 12,
            }}
          >
            <AppText
              style={{
                fontSize: 10,
                color: c.textMuted,
                fontWeight: "700",
                letterSpacing: 0.8,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              {t("referral.code.shareVia")}
            </AppText>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Pressable
                onPress={openWA}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  backgroundColor: "rgba(37,211,102,0.08)",
                  borderColor: "rgba(37,211,102,0.30)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
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
                  {t("referral.code.whatsapp")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={openX}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderColor: "rgba(231,233,234,0.20)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Ionicons name="logo-twitter" size={12} color="#e7e9ea" />
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#e7e9ea",
                  }}
                >
                  {t("referral.code.post")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* ── Stats Grid (2 × 2) ── */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <StatCard
            iconName="people-outline"
            label={t("referral.stats.totalInvited")}
            value={String(d?.stats?.totalReferrals ?? 0)}
            sub={t("referral.stats.totalInvitedSub")}
            c={c}
          />
          <StatCard
            iconName="checkmark-circle-outline"
            label={t("referral.stats.conversions")}
            value={String(d?.stats?.successfulReferrals ?? 0)}
            sub={t("referral.stats.conversionsSub")}
            accent="green"
            c={c}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <StatCard
            iconName="time-outline"
            label={t("referral.stats.pending")}
            value={String(d?.stats?.pendingReferrals ?? 0)}
            sub={t("referral.stats.pendingSub")}
            c={c}
          />
          <StatCard
            iconName="wallet-outline"
            label={t("referral.stats.walletBalance")}
            value={fmtAmt(d?.wallet?.balance)}
            sub={t("referral.stats.walletBalanceSub")}
            accent="orange"
            c={c}
          />
        </View>

        {/* ── Tier Card ── */}
        <Card
          padded
          style={{
            marginBottom: 12,
            borderColor: tier ? ts.border : c.border,
            backgroundColor: tier ? ts.bg : c.bgPanel,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <AppText
              variant="small"
              weight="semibold"
              tone="dim"
              style={{ letterSpacing: 0.8, textTransform: "uppercase" }}
            >
              {t("referral.tier.label")}
            </AppText>
            {tier && <TierBadge tier={tier.key} t={t} c={c} />}
          </View>

          {tier && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <Ionicons name={ts.iconName} size={32} color={ts.color} />
                <View>
                  <AppText
                    weight="displayBlack"
                    style={{ fontSize: 18, color: ts.color }}
                  >
                    {t(`referral.tier.${tier.key.toLowerCase()}`)}
                  </AppText>
                  <AppText variant="small" tone="dim">
                    {t("referral.tier.successCount", {
                      count: tier.successCount,
                    })}
                  </AppText>
                </View>
              </View>

              {/* Progress bar */}
              <View style={{ marginBottom: 16 }}>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    overflow: "hidden",
                    backgroundColor: c.bgCard,
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: ts.color,
                      width: `${tier.progressPct}%`,
                      minWidth: 4,
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <AppText variant="small" tone="dim">
                    {tier.successCount}
                  </AppText>
                  <AppText
                    variant="small"
                    weight="semibold"
                    tone="dim"
                    style={{ textAlign: "right", flex: 1, paddingLeft: 8 }}
                  >
                    {tier.referralsToNext > 0
                      ? t("referral.tier.toNext", {
                          count: tier.referralsToNext,
                          label: tier.nextTierLabel,
                        })
                      : t("referral.tier.maxReached")}
                  </AppText>
                </View>
              </View>

              {/* Earnings rows */}
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border,
                  overflow: "hidden",
                }}
              >
                {[
                  {
                    iconName: "construct-outline",
                    label: t("referral.tier.perWorker"),
                    val: fmtAmt(tier.workerBonus),
                  },
                  {
                    iconName: "person-outline",
                    label: t("referral.tier.perHirer"),
                    val: fmtAmt(tier.hirerBonus),
                  },
                ].map((row, i) => (
                  <View
                    key={row.label}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
                      borderTopColor: c.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={row.iconName}
                        size={12}
                        color={c.textDim}
                      />
                      <AppText variant="body" tone="dim">
                        {row.label}
                      </AppText>
                    </View>
                    <AppText
                      weight="semibold"
                      style={{ color: ts.color, fontSize: 15 }}
                    >
                      {row.val}
                    </AppText>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>

        {/* ── Wallet Card ── */}
        <Card padded style={{ marginBottom: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <AppText
              variant="small"
              weight="semibold"
              tone="dim"
              style={{ letterSpacing: 0.8, textTransform: "uppercase" }}
            >
              {t("referral.wallet.label")}
            </AppText>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.bgCard,
              }}
            >
              <AppText variant="small" weight="semibold" tone="dim">
                ₦ NGN
              </AppText>
            </View>
          </View>

          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              fontWeight: "700",
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            {t("referral.wallet.available")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 28,
              lineHeight: 34,
              color: "#22c55e",
              marginTop: 4,
              marginBottom: 4,
            }}
          >
            {fmtAmt(d?.wallet?.balance)}
          </AppText>
          <AppText variant="small" tone="dim" style={{ marginBottom: 16 }}>
            {t("referral.wallet.lifetime")}: {fmtAmt(d?.wallet?.lifetimeTotal)}
          </AppText>

          <Pressable
            onPress={() => d?.wallet?.canWithdraw && setShowWd(true)}
            style={{
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
              flexDirection: "row",
              gap: 6,
              backgroundColor: d?.wallet?.canWithdraw ? "#22c55e" : c.bgCard,
              borderWidth: d?.wallet?.canWithdraw ? 0 : 1,
              borderColor: c.border,
            }}
          >
            <Ionicons
              name="card-outline"
              size={14}
              color={d?.wallet?.canWithdraw ? "#000" : c.textMuted}
            />
            <AppText
              weight="semibold"
              style={{
                fontSize: 14,
                color: d?.wallet?.canWithdraw ? "#000" : c.textMuted,
              }}
            >
              {t("referral.wallet.withdraw")}
            </AppText>
          </Pressable>

          {!d?.wallet?.canWithdraw && (
            <AppText
              variant="small"
              tone="dim"
              style={{ textAlign: "center", marginTop: 4, lineHeight: 16 }}
            >
              {t("referral.wallet.minNote", {
                min: fmtAmt(d?.wallet?.minWithdrawal),
              })}
              {(d?.wallet?.balance ?? 0) > 0
                ? ` · ${t("referral.wallet.youHave", {
                    amount: fmtAmt(d.wallet.balance),
                  })}`
                : ""}
            </AppText>
          )}

          {d?.recentEarnings?.length > 0 && (
            <View
              style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: c.border,
                paddingTop: 14,
                marginTop: 14,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  color: c.textMuted,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}
              >
                {t("referral.wallet.recentEarnings")}
              </AppText>
              {d.recentEarnings.slice(0, 4).map((tx) => (
                <View
                  key={tx.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.border,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <AppText variant="body" tone="dim" numberOfLines={1}>
                      {tx.description}
                    </AppText>
                    <AppText variant="small" tone="dim">
                      {timeAgo(tx.createdAt, t)}
                    </AppText>
                  </View>
                  <AppText
                    weight="semibold"
                    style={{
                      color: tx.amount >= 0 ? "#22c55e" : "#ef4444",
                      fontSize: 13,
                    }}
                  >
                    {tx.amount < 0 ? "-" : "+"}₦
                    {Math.abs(tx.amount).toLocaleString()}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* ── How It Works ── */}
        <Card padded style={{ marginBottom: 12 }}>
          <AppText
            variant="small"
            weight="semibold"
            tone="dim"
            style={{
              letterSpacing: 0.8,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            {t("referral.how.title")}
          </AppText>
          {[
            {
              iconName: "copy-outline",
              stepKey: "referral.how.step1",
              titleKey: "referral.how.shareTitle",
              descKey: "referral.how.shareDesc",
            },
            {
              iconName: "create-outline",
              stepKey: "referral.how.step2",
              titleKey: "referral.how.signupTitle",
              descKey: "referral.how.signupDesc",
            },
            {
              iconName: "checkmark-circle-outline",
              stepKey: "referral.how.step3",
              titleKey: "referral.how.bookingTitle",
              descKey: "referral.how.bookingDesc",
            },
            {
              iconName: "cash-outline",
              stepKey: "referral.how.youEarn",
              titleKey: "referral.how.earnTitle",
              descKey: null,
            },
          ].map((p, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
                paddingVertical: 12,
                borderBottomWidth: i < 3 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: c.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: "rgba(249,115,22,0.10)",
                }}
              >
                <Ionicons name={p.iconName} size={16} color={c.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontSize: 9,
                    color: c.orange,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  {t(p.stepKey)}
                </AppText>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text, marginTop: 2, marginBottom: 3 }}
                >
                  {t(p.titleKey)}
                </AppText>
                <AppText variant="small" tone="dim" style={{ lineHeight: 18 }}>
                  {p.descKey
                    ? t(p.descKey)
                    : d?.perks
                      ? d.perks.whatYouEarn[
                          user?.role?.toLowerCase() || "worker"
                        ]
                      : t("referral.how.earnDescFallback")}
                </AppText>
              </View>
            </View>
          ))}
        </Card>

        {/* Referee perks */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          {[
            {
              iconName: "construct-outline",
              roleKey: "referral.perks.workersGet",
              desc:
                d?.perks?.whatTheyGet?.worker ||
                t("referral.perks.workersFallback"),
            },
            {
              iconName: "person-outline",
              roleKey: "referral.perks.hirersGet",
              desc:
                d?.perks?.whatTheyGet?.hirer ||
                t("referral.perks.hirersFallback"),
            },
          ].map((p, i) => (
            <Card key={i} padded style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 6,
                }}
              >
                <Ionicons name={p.iconName} size={12} color={c.textDim} />
                <AppText
                  variant="small"
                  weight="semibold"
                  tone="dim"
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {t(p.roleKey)}
                </AppText>
              </View>
              <AppText variant="small" tone="dim" style={{ lineHeight: 17 }}>
                {p.desc}
              </AppText>
            </Card>
          ))}
        </View>

        {/* ── Tabs ── */}
        <Card style={{ overflow: "hidden" }}>
          <View
            style={{
              flexDirection: "row",
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            {[
              {
                key: "referrals",
                label: t("referral.tabs.referrals", {
                  count: d?.stats?.totalReferrals ?? 0,
                }),
                iconName: "people-outline",
              },
              {
                key: "leaderboard",
                label: t("referral.tabs.leaderboard"),
                iconName: "trophy-outline",
              },
            ].map((tabItem) => (
              <Pressable
                key={tabItem.key}
                onPress={() => setTab(tabItem.key)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 5,
                  borderBottomWidth: 2,
                  borderBottomColor:
                    tab === tabItem.key ? c.orange : "transparent",
                  backgroundColor:
                    tab === tabItem.key
                      ? "rgba(249,115,22,0.06)"
                      : "transparent",
                }}
              >
                <Ionicons
                  name={tabItem.iconName}
                  size={13}
                  color={tab === tabItem.key ? c.orange : c.textMuted}
                />
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: tab === tabItem.key ? "700" : "600",
                    color: tab === tabItem.key ? c.orange : c.textMuted,
                  }}
                  numberOfLines={1}
                >
                  {tabItem.label}
                </AppText>
              </Pressable>
            ))}
          </View>

          {/* My Referrals */}
          {tab === "referrals" && (
            <View style={{ padding: 16 }}>
              {!d?.referrals?.length ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <Ionicons
                    name="people-outline"
                    size={40}
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
                    {t("referral.referrals.empty")}
                  </AppText>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ textAlign: "center", marginBottom: 16 }}
                  >
                    {t("referral.referrals.emptySub")}
                  </AppText>
                  <Pressable
                    onPress={copyLink}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(249,115,22,0.35)",
                      backgroundColor: "rgba(249,115,22,0.08)",
                    }}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: c.orange }}
                    >
                      {t("referral.referrals.emptyBtn")}
                    </AppText>
                  </Pressable>
                </View>
              ) : (
                d.referrals.map((r) => {
                  const rs = STATUS_META[r.status] || STATUS_META.EXPIRED;
                  const rcol = statusColors(rs.cls, c);
                  return (
                    <View
                      key={r.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: c.border,
                        backgroundColor: c.bgCard,
                        marginBottom: 8,
                      }}
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
                            marginTop: 3,
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
                                ? t("referral.role.worker").toUpperCase()
                                : t("referral.role.hirer").toUpperCase()}
                            </AppText>
                          </View>
                          <AppText variant="small" tone="dim">
                            · {t("referral.joined")} {timeAgo(r.joinedAt, t)}
                          </AppText>
                        </View>
                        {r.campaign && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 5,
                              flexWrap: "wrap",
                            }}
                          >
                            <CampaignBadge
                              status={r.campaign.status}
                              t={t}
                              c={c}
                            />
                            <AppText
                              variant="small"
                              tone="dim"
                              style={{ fontSize: 10 }}
                            >
                              {t("referral.referrals.tasks", {
                                done: r.campaign.tasksCompleted,
                                total: r.campaign.tasksTotal,
                                amount: fmtAmt(r.campaign.rewardAmount),
                              })}
                            </AppText>
                          </View>
                        )}
                      </View>
                      <View
                        style={{
                          alignItems: "flex-end",
                          gap: 4,
                          marginLeft: 8,
                        }}
                      >
                        <StatusBadge status={r.status} t={t} c={c} />
                        {r.status === "REWARDED" && (
                          <AppText
                            weight="semibold"
                            style={{ fontSize: 12, color: "#22c55e" }}
                          >
                            +{fmtAmt(r.bonus)}
                          </AppText>
                        )}
                        {r.status === "PENDING" && r.expiresAt && (
                          <AppText style={{ fontSize: 9, color: c.textMuted }}>
                            {t("referral.expires")} {fmtDate(r.expiresAt)}
                          </AppText>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Leaderboard */}
          {tab === "leaderboard" && (
            <View style={{ padding: 16 }}>
              {!leaderboard ? (
                <View>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 12,
                        paddingHorizontal: 8,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: c.border,
                      }}
                    >
                      <Skeleton height={20} width={28} c={c} radius={4} />
                      <Skeleton height={32} width={32} c={c} radius={16} />
                      <View style={{ flex: 1 }}>
                        <Skeleton
                          height={14}
                          width="60%"
                          c={c}
                          style={{ marginBottom: 6 }}
                        />
                        <Skeleton height={16} width={70} c={c} radius={20} />
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Skeleton
                          height={13}
                          width={70}
                          c={c}
                          style={{ marginBottom: 4 }}
                        />
                        <Skeleton height={11} width={50} c={c} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <>
                  {d?.leaderboardRank && (
                    <View
                      style={{
                        borderRadius: 10,
                        borderWidth: 1,
                        padding: 12,
                        marginBottom: 12,
                        backgroundColor: "rgba(249,115,22,0.08)",
                        borderColor: "rgba(249,115,22,0.30)",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name="medal-outline"
                        size={14}
                        color={c.orange}
                      />
                      <AppText
                        weight="semibold"
                        style={{ color: c.orange, fontSize: 12, flex: 1 }}
                      >
                        {t("referral.leaderboard.youAre")}{" "}
                        <AppText
                          weight="displayBlack"
                          style={{ color: c.orange }}
                        >
                          #{d.leaderboardRank}
                        </AppText>{" "}
                        {t("referral.leaderboard.onBoard")}
                      </AppText>
                    </View>
                  )}

                  {leaderboard.leaderboard?.map((u, i) => {
                    const tierKey = u.tier?.replace(/[^A-Z]/g, "") || "BRONZE";
                    const medal =
                      i === 0
                        ? "medal"
                        : i === 1
                          ? "medal-outline"
                          : i === 2
                            ? "medal-outline"
                            : null;
                    const medalColor =
                      i === 0
                        ? "#fbbf24"
                        : i === 1
                          ? "#94a3b8"
                          : i === 2
                            ? "#cd7f32"
                            : c.textMuted;
                    return (
                      <View
                        key={i}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 12,
                          paddingHorizontal: 8,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: c.border,
                          gap: 10,
                          backgroundColor: u.isMe
                            ? "rgba(249,115,22,0.06)"
                            : "transparent",
                        }}
                      >
                        <View
                          style={{
                            width: 28,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {medal ? (
                            <Ionicons
                              name={medal}
                              size={18}
                              color={medalColor}
                            />
                          ) : (
                            <AppText
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: c.textMuted,
                              }}
                            >
                              #{u.rank}
                            </AppText>
                          )}
                        </View>
                        <Avatar
                          name={u.name}
                          avatar={u.avatar}
                          size={32}
                          c={c}
                        />
                        <View style={{ flex: 1, marginLeft: 4, gap: 4 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <AppText
                              variant="body"
                              weight="semibold"
                              style={{ color: c.text }}
                              numberOfLines={1}
                            >
                              {u.name}
                            </AppText>
                            {u.isMe && (
                              <View
                                style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                  backgroundColor: c.orange,
                                }}
                              >
                                <AppText
                                  style={{
                                    fontSize: 9,
                                    fontWeight: "800",
                                    color: "#000",
                                  }}
                                >
                                  {t("referral.leaderboard.you")}
                                </AppText>
                              </View>
                            )}
                          </View>
                          <TierBadge tier={tierKey} t={t} c={c} />
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <AppText
                            variant="body"
                            weight="semibold"
                            style={{ color: c.text, fontSize: 13 }}
                          >
                            {t("referral.leaderboard.referrals", {
                              count: u.referrals,
                            })}
                          </AppText>
                          <AppText variant="small" tone="dim">
                            {fmtAmt(u.earned)}
                          </AppText>
                        </View>
                      </View>
                    );
                  })}

                  {/* Tier reference grid */}
                  <View
                    style={{
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: c.border,
                      paddingTop: 16,
                      marginTop: 8,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 10,
                        color: c.textMuted,
                        fontWeight: "700",
                        letterSpacing: 0.8,
                        marginBottom: 12,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("referral.leaderboard.tierRequirements")}
                    </AppText>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                    >
                      {leaderboard.tiers?.map((tt) => {
                        const ts3 = TIER_STYLES[tt.key] || TIER_STYLES.BRONZE;
                        return (
                          <View
                            key={tt.key}
                            style={{
                              borderRadius: 10,
                              borderWidth: 1,
                              padding: 12,
                              gap: 3,
                              borderColor: ts3.border,
                              backgroundColor: ts3.bg,
                              width: (width - 32 - 24) / 2,
                            }}
                          >
                            <AppText
                              style={{
                                color: ts3.color,
                                fontWeight: "700",
                                fontSize: 12,
                                marginBottom: 4,
                              }}
                            >
                              {t(`referral.tier.${tt.key.toLowerCase()}`)}
                            </AppText>
                            <AppText variant="small" tone="dim">
                              {t("referral.leaderboard.minRefs", {
                                count: tt.minReferrals,
                              })}
                            </AppText>
                            <AppText variant="small" tone="dim">
                              {t("referral.leaderboard.worker")}:{" "}
                              {fmtAmt(tt.workerBonus)}
                            </AppText>
                            <AppText variant="small" tone="dim">
                              {t("referral.leaderboard.hirer")}:{" "}
                              {fmtAmt(tt.hirerBonus)}
                            </AppText>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
        </Card>
      </ScrollView>

      <WithdrawModal
        visible={showWd}
        wallet={d?.wallet}
        onClose={() => setShowWd(false)}
        onSuccess={load}
        c={c}
        modalBg={modalBg}
        t={t}
        toast={toast}
      />
    </>
  );
}
