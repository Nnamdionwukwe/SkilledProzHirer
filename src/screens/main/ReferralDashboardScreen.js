// src/screens/main/ReferralDashboardScreen.js
// Mirrors: website /referral/dashboard
// APIs:
//   GET  /referral/dashboard   → full dashboard data
//   GET  /referral/leaderboard → top referrers
//   POST /referral/withdraw    → { amount, bankName, accountNumber, accountName }

import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "../../components/AppText";
import Card from "../../components/Card";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client"; // ← correct path — NOT ../../lib/api

// ─── Tier constants ───────────────────────────────────────────────────────────
const TIER_STYLES = {
  BRONZE: {
    color: "#cd7f32",
    bg: "rgba(205,127,50,0.14)",
    border: "rgba(205,127,50,0.35)",
    emoji: "🥉",
  },
  SILVER: {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.14)",
    border: "rgba(148,163,184,0.35)",
    emoji: "🥈",
  },
  GOLD: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.14)",
    border: "rgba(251,191,36,0.35)",
    emoji: "🥇",
  },
  DIAMOND: {
    color: "#67e8f9",
    bg: "rgba(103,232,249,0.14)",
    border: "rgba(103,232,249,0.35)",
    emoji: "💎",
  },
};

const STATUS_COLORS = {
  PENDING: { color: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  QUALIFIED: { color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  CONVERTED: { color: "#60a5fa", bg: "rgba(59,130,246,0.15)" },
  REWARDED: { color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  EXPIRED: { color: "#6b7280", bg: "rgba(107,114,128,0.14)" },
  FLAGGED: { color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
const timeAgo = (d) => {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
};

// ─── StatCard (same pattern as WorkerWithdrawalsScreen) ──────────────────────
function StatCard({ label, value, sub, orange, green, c }) {
  const bgColor = orange
    ? "rgba(249,115,22,0.15)"
    : green
      ? "rgba(34,197,94,0.12)"
      : c.bgPanel;
  const bdColor = orange
    ? "rgba(249,115,22,0.40)"
    : green
      ? "rgba(34,197,94,0.35)"
      : c.border;
  const valColor = orange ? c.orange : green ? "#22c55e" : c.text;
  return (
    <View style={[sc.card, { backgroundColor: bgColor, borderColor: bdColor }]}>
      <AppText
        style={{
          fontSize: 10,
          color: c.textMuted,
          fontWeight: "700",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </AppText>
      <AppText
        weight="displayBlack"
        style={{ fontSize: 22, lineHeight: 28, color: valColor, marginTop: 4 }}
      >
        {value}
      </AppText>
      {sub ? (
        <AppText style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}
const sc = StyleSheet.create({
  card: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 13 },
});

// ─── TierBadge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const ts = TIER_STYLES[tier] || TIER_STYLES.BRONZE;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: ts.bg,
        borderColor: ts.border,
      }}
    >
      <AppText
        style={{
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.3,
          color: ts.color,
        }}
      >
        {ts.emoji} {tier}
      </AppText>
    </View>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.EXPIRED;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: s.bg,
        borderColor: `${s.color}55`,
      }}
    >
      <AppText style={{ fontSize: 10, fontWeight: "700", color: s.color }}>
        {status}
      </AppText>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, avatar, size = 38, c }) {
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

// ─── Referral Row ─────────────────────────────────────────────────────────────
function ReferralRow({ r, c }) {
  const s = STATUS_COLORS[r.status] || STATUS_COLORS.EXPIRED;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      }}
    >
      <Avatar name={r.name} avatar={r.avatar} c={c} />
      <View style={{ flex: 1, marginLeft: 12 }}>
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
            }}
          >
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: r.role === "WORKER" ? c.orange : "#818cf8",
              }}
            >
              {r.role === "WORKER" ? "🔨 WORKER" : "🧑 HIRER"}
            </AppText>
          </View>
          <AppText variant="small" tone="dim">
            · {timeAgo(r.joinedAt)}
          </AppText>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            borderWidth: 1,
            backgroundColor: s.bg,
            borderColor: `${s.color}55`,
          }}
        >
          <AppText style={{ fontSize: 10, color: s.color, fontWeight: "700" }}>
            {r.status}
          </AppText>
        </View>
        {r.status === "REWARDED" && (
          <AppText weight="semibold" style={{ fontSize: 13, color: "#22c55e" }}>
            +{fmtAmt(r.bonus)}
          </AppText>
        )}
        {r.status === "PENDING" && r.expiresAt && (
          <AppText style={{ fontSize: 10, color: c.textMuted }}>
            Exp {fmtDate(r.expiresAt)}
          </AppText>
        )}
      </View>
    </View>
  );
}

// ─── Withdraw Modal (bottom sheet — same pattern as RequestPayoutModal) ────────
function WithdrawModal({
  visible,
  wallet,
  onClose,
  onSuccess,
  c,
  modalBg,
  toast,
}) {
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [submitting, setSub] = useState(false);

  function setF(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const avail = wallet?.balance ?? 0;
  const minWd = wallet?.minWithdrawal ?? 5000;
  const setPercent = (pct) =>
    setF("amount", (pct === 1 ? avail : avail * pct).toFixed(0));

  async function submit() {
    const numAmt = parseFloat(form.amount);
    if (!numAmt || numAmt < minWd) {
      toast.error(`Minimum withdrawal is ${fmtAmt(minWd)}`);
      return;
    }
    if (numAmt > avail) {
      toast.error(`Insufficient balance. Available: ${fmtAmt(avail)}`);
      return;
    }
    if (!form.bankName || !form.accountNumber || !form.accountName) {
      toast.error("All bank details are required");
      return;
    }
    setSub(true);
    try {
      await client.post("/referral/withdraw", {
        amount: form.amount,
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
      });
      toast.success("Withdrawal submitted! Processing in 1–3 business days 💸");
      setForm({ amount: "", bankName: "", accountNumber: "", accountName: "" });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Withdrawal failed");
    } finally {
      setSub(false);
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
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
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
              <AppText
                weight="displayBlack"
                style={{ fontSize: 24, color: c.text }}
              >
                💸 Withdraw Earnings
              </AppText>
              <Pressable
                onPress={onClose}
                style={[wm.closeBtn, { borderColor: c.border }]}
              >
                <Ionicons name="close" size={18} color={c.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Balance summary */}
              <View
                style={[
                  wm.balRow,
                  {
                    backgroundColor: "rgba(34,197,94,0.10)",
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
                    AVAILABLE
                  </AppText>
                  <AppText
                    weight="displayBlack"
                    style={{ color: "#22c55e", fontSize: 22, marginTop: 2 }}
                  >
                    {fmtAmt(avail)}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    style={{
                      fontSize: 9,
                      color: c.textMuted,
                      letterSpacing: 0.8,
                      fontWeight: "700",
                    }}
                  >
                    MINIMUM
                  </AppText>
                  <AppText
                    weight="semibold"
                    style={{ color: c.textMuted, fontSize: 16, marginTop: 2 }}
                  >
                    {fmtAmt(minWd)}
                  </AppText>
                </View>
              </View>

              {/* Amount */}
              <AppText style={wm.sectionLabel}>AMOUNT (₦) *</AppText>
              <View
                style={[
                  wm.amtRow,
                  {
                    borderColor: c.border,
                    backgroundColor: c.bgInput ?? c.bgCard,
                  },
                ]}
              >
                <View style={[wm.curBadge, { backgroundColor: c.bgPanel }]}>
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.textMuted }}
                  >
                    NGN
                  </AppText>
                </View>
                <TextInput
                  value={form.amount}
                  onChangeText={(v) => setF("amount", v)}
                  placeholder="0"
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
                      {p === 1 ? "Max" : `${p * 100}%`}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {/* Bank fields */}
              <AppText style={[wm.sectionLabel, { marginTop: 4 }]}>
                BANK DETAILS
              </AppText>
              {[
                {
                  k: "bankName",
                  label: "Bank Name *",
                  kb: "default",
                  ph: "e.g. First Bank",
                },
                {
                  k: "accountNumber",
                  label: "Account Number *",
                  kb: "numeric",
                  ph: "10-digit number",
                  max: 10,
                },
                {
                  k: "accountName",
                  label: "Account Name *",
                  kb: "default",
                  ph: "Name as on account",
                },
              ].map((f) => (
                <View key={f.k} style={{ marginBottom: 12 }}>
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.textMuted, marginBottom: 6 }}
                  >
                    {f.label}
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
                        backgroundColor: c.bgInput ?? c.bgCard,
                      },
                    ]}
                  />
                </View>
              ))}

              <Pressable
                onPress={submit}
                disabled={submitting || !form.amount.trim()}
                style={[
                  wm.submitBtn,
                  {
                    backgroundColor: form.amount.trim() ? c.orange : c.bgPanel,
                    opacity: form.amount.trim() ? 1 : 0.6,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: form.amount.trim() ? "#fff" : c.textMuted }}
                  >
                    Request Withdrawal
                  </AppText>
                )}
              </Pressable>

              <AppText
                variant="small"
                tone="dim"
                style={{ textAlign: "center", marginTop: 8, marginBottom: 32 }}
              >
                Processing within 1–3 business days
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
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  balRow: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 10,
    color: "#6b7280",
    letterSpacing: 0.8,
    fontWeight: "700",
    marginBottom: 10,
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
    borderRightColor: "rgba(255,255,255,0.08)",
  },
  pctRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  pctBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 14 },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function ReferralDashboardScreen() {
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

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await client.get("/referral/dashboard");
      setDashboard(res.data.data);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? "Failed to load referral data",
      );
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

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function copyLink() {
    const link = dashboard?.link || "";
    if (!link) return;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    try {
      await Share.share({
        message: dashboard?.shareText || "",
        url: dashboard?.link || "",
      });
    } catch {}
  }

  const openWA = () => {
    const text = encodeURIComponent(dashboard?.shareText || "");
    Linking.openURL(`whatsapp://send?text=${text}`).catch(() =>
      Linking.openURL(`https://wa.me/?text=${text}`),
    );
  };
  const openX = () =>
    Linking.openURL(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(dashboard?.shareText || "")}`,
    );

  // ── Derived ─────────────────────────────────────────────────────────────────
  const d = dashboard;
  const tier = d?.tier;
  const ts = tier
    ? TIER_STYLES[tier.key] || TIER_STYLES.BRONZE
    : TIER_STYLES.BRONZE;

  // ── Initial loading spinner ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={c.orange} />
      </View>
    );
  }

  // ── Main render — NOTE: <> fragment wraps ScrollView + WithdrawModal ─────────
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
            marginBottom: 18,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText
              style={{
                fontSize: 11,
                color: c.orange,
                fontWeight: "700",
                letterSpacing: 0.8,
              }}
            >
              REFERRAL PROGRAM
            </AppText>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 34,
                lineHeight: 40,
                color: c.text,
                marginVertical: 4,
              }}
            >
              Invite & Earn
            </AppText>
            <AppText variant="body" tone="dim">
              Share your code. Earn real money when your referrals complete
              their first booking.
            </AppText>
          </View>
          {d?.leaderboardRank && (
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: "rgba(249,115,22,0.15)",
                borderWidth: 1,
                borderColor: "rgba(249,115,22,0.4)",
                borderRadius: 20,
              }}
            >
              <AppText
                style={{ fontSize: 12, fontWeight: "700", color: c.orange }}
              >
                🏅 Rank #{d.leaderboardRank}
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
            borderColor: "rgba(249,115,22,0.35)",
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              fontWeight: "700",
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            YOUR REFERRAL CODE
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 36,
              color: c.orange,
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            {d?.code || "—"}
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
            {d?.link || "Loading…"}
          </AppText>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <Pressable
              onPress={copyLink}
              disabled={!d?.link}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: copied ? "#22c55e" : c.orange,
              }}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: "#000" }}
              >
                {copied ? "✅ Copied!" : "📋 Copy Link"}
              </AppText>
            </Pressable>
            <Pressable
              onPress={shareLink}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 11,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(249,115,22,0.4)",
                backgroundColor: "rgba(249,115,22,0.10)",
              }}
            >
              <Ionicons
                name="share-outline"
                size={15}
                color={c.orange}
                style={{ marginRight: 5 }}
              />
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange }}
              >
                Share
              </AppText>
            </Pressable>
          </View>

          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: c.border,
              paddingTop: 14,
            }}
          >
            <AppText
              style={{
                fontSize: 10,
                color: c.textMuted,
                fontWeight: "700",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              SHARE VIA
            </AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={openWA}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  backgroundColor: "rgba(37,211,102,0.08)",
                  borderColor: "rgba(37,211,102,0.35)",
                }}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "700", color: "#25d366" }}
                >
                  WhatsApp
                </AppText>
              </Pressable>
              <Pressable
                onPress={openX}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  borderColor: "rgba(231,233,234,0.2)",
                }}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "700", color: "#e7e9ea" }}
                >
                  Post on X
                </AppText>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* ── Stats Grid (2 × 2) ── */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <StatCard
            label="TOTAL INVITED"
            value={String(d?.stats?.totalReferrals ?? 0)}
            sub="All referrals"
            c={c}
          />
          <StatCard
            label="CONVERSIONS"
            value={String(d?.stats?.successfulReferrals ?? 0)}
            sub="Completed bookings"
            green
            c={c}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <StatCard
            label="PENDING"
            value={String(d?.stats?.pendingReferrals ?? 0)}
            sub="Awaiting first booking"
            c={c}
          />
          <StatCard
            label="WALLET BALANCE"
            value={fmtAmt(d?.wallet?.balance)}
            sub="Available to withdraw"
            orange
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
              marginBottom: 14,
            }}
          >
            <AppText
              variant="small"
              weight="semibold"
              tone="dim"
              style={{ letterSpacing: 0.8 }}
            >
              YOUR TIER
            </AppText>
            {tier && <TierBadge tier={tier.key} />}
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
                <AppText style={{ fontSize: 44 }}>{ts.emoji}</AppText>
                <View>
                  <AppText
                    weight="displayBlack"
                    style={{ fontSize: 22, color: ts.color }}
                  >
                    {tier.current}
                  </AppText>
                  <AppText variant="small" tone="dim">
                    {tier.successCount} successful referral
                    {tier.successCount !== 1 ? "s" : ""}
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
                      ? `${tier.referralsToNext} more to ${tier.nextTierLabel}`
                      : "Maximum tier reached 🎉"}
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
                    label: "🔨 Per Worker referral",
                    val: fmtAmt(tier.workerBonus),
                  },
                  {
                    label: "🧑 Per Hirer referral",
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
                    <AppText variant="body" tone="dim">
                      {row.label}
                    </AppText>
                    <AppText
                      weight="semibold"
                      style={{ color: ts.color, fontSize: 16 }}
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
              marginBottom: 14,
            }}
          >
            <AppText
              variant="small"
              weight="semibold"
              tone="dim"
              style={{ letterSpacing: 0.8 }}
            >
              EARNINGS WALLET
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
            }}
          >
            AVAILABLE BALANCE
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 36,
              color: "#22c55e",
              marginTop: 4,
              marginBottom: 4,
            }}
          >
            {fmtAmt(d?.wallet?.balance)}
          </AppText>
          <AppText variant="small" tone="dim" style={{ marginBottom: 16 }}>
            Total earned all-time: {fmtAmt(d?.wallet?.lifetimeTotal)}
          </AppText>

          <Pressable
            onPress={() => d?.wallet?.canWithdraw && setShowWd(true)}
            style={{
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
              backgroundColor: d?.wallet?.canWithdraw ? "#22c55e" : c.bgCard,
              borderWidth: d?.wallet?.canWithdraw ? 0 : 1,
              borderColor: c.border,
            }}
          >
            <AppText
              weight="semibold"
              style={{
                fontSize: 15,
                color: d?.wallet?.canWithdraw ? "#000" : c.textMuted,
              }}
            >
              💸 Withdraw Earnings
            </AppText>
          </Pressable>

          {!d?.wallet?.canWithdraw && (
            <AppText
              variant="small"
              tone="dim"
              style={{ textAlign: "center", marginTop: 4 }}
            >
              Min. {fmtAmt(d?.wallet?.minWithdrawal)} needed
              {(d?.wallet?.balance ?? 0) > 0
                ? ` · You have ${fmtAmt(d.wallet.balance)}`
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
                }}
              >
                RECENT EARNINGS
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
                      {timeAgo(tx.createdAt)}
                    </AppText>
                  </View>
                  <AppText
                    weight="semibold"
                    style={{
                      color: tx.amount >= 0 ? "#22c55e" : "#ef4444",
                      fontSize: 14,
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
            style={{ letterSpacing: 0.8, marginBottom: 14 }}
          >
            HOW IT WORKS
          </AppText>
          {[
            {
              icon: "🔗",
              step: "Step 1",
              title: "Share your code",
              desc: "Copy your unique link and share with friends, colleagues, or on social media.",
            },
            {
              icon: "📝",
              step: "Step 2",
              title: "They sign up",
              desc: "Your referral creates an account using your code and gets exclusive perks.",
            },
            {
              icon: "✅",
              step: "Step 3",
              title: "They complete a booking",
              desc: "Once your referral completes their first booking, your reward is credited.",
            },
            {
              icon: "💰",
              step: "You earn",
              title: "Cash in your wallet",
              desc: d?.perks
                ? d.perks.whatYouEarn[user?.role?.toLowerCase() || "worker"]
                : "Earn ₦800–₦3,500 per referral based on your tier.",
            },
          ].map((p, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
                paddingVertical: 14,
                borderBottomWidth: i < 3 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: c.border,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: "rgba(249,115,22,0.12)",
                }}
              >
                <AppText style={{ fontSize: 20 }}>{p.icon}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontSize: 10,
                    color: c.orange,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                  }}
                >
                  {p.step}
                </AppText>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text, marginTop: 2, marginBottom: 3 }}
                >
                  {p.title}
                </AppText>
                <AppText variant="small" tone="dim" style={{ lineHeight: 18 }}>
                  {p.desc}
                </AppText>
              </View>
            </View>
          ))}
        </Card>

        {/* Referee perks */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          {[
            {
              role: "🔨 Workers get",
              desc:
                d?.perks?.whatTheyGet?.worker ||
                "30-day profile boost + fee waived on first 3 jobs",
            },
            {
              role: "🧑 Hirers get",
              desc:
                d?.perks?.whatTheyGet?.hirer ||
                "5% off first booking (up to ₦2,500) + ₦150 credit",
            },
          ].map((p, i) => (
            <Card key={i} padded style={{ flex: 1 }}>
              <AppText
                variant="small"
                weight="semibold"
                tone="dim"
                style={{ marginBottom: 4 }}
              >
                {p.role}
              </AppText>
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
                label: `My Referrals${(d?.stats?.totalReferrals ?? 0) > 0 ? ` (${d.stats.totalReferrals})` : ""}`,
              },
              { key: "leaderboard", label: "🏆 Leaderboard" },
            ].map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: tab === t.key ? c.orange : "transparent",
                  backgroundColor:
                    tab === t.key ? "rgba(249,115,22,0.08)" : "transparent",
                }}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: tab === t.key ? c.orange : c.textMuted }}
                >
                  {t.label}
                </AppText>
              </Pressable>
            ))}
          </View>

          {/* My Referrals */}
          {tab === "referrals" && (
            <View style={{ padding: 16 }}>
              {!d?.referrals?.length ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <AppText style={{ fontSize: 40, marginBottom: 10 }}>
                    👥
                  </AppText>
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.text, marginBottom: 4 }}
                  >
                    No referrals yet
                  </AppText>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ textAlign: "center", marginBottom: 16 }}
                  >
                    Share your referral code to get started!
                  </AppText>
                  <Pressable
                    onPress={copyLink}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(249,115,22,0.4)",
                      backgroundColor: c.orangeDim,
                    }}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: c.orange }}
                    >
                      Copy my referral link
                    </AppText>
                  </Pressable>
                </View>
              ) : (
                d.referrals.map((r) => <ReferralRow key={r.id} r={r} c={c} />)
              )}
            </View>
          )}

          {/* Leaderboard */}
          {tab === "leaderboard" && (
            <View style={{ padding: 16 }}>
              {!leaderboard ? (
                <ActivityIndicator
                  color={c.orange}
                  style={{ marginVertical: 32 }}
                />
              ) : (
                <>
                  {d?.leaderboardRank && (
                    <View
                      style={{
                        borderRadius: 10,
                        borderWidth: 1,
                        padding: 12,
                        marginBottom: 12,
                        backgroundColor: "rgba(249,115,22,0.12)",
                        borderColor: "rgba(249,115,22,0.35)",
                      }}
                    >
                      <AppText
                        weight="semibold"
                        style={{ color: c.orange, fontSize: 13 }}
                      >
                        🏅 You are rank{" "}
                        <AppText
                          weight="displayBlack"
                          style={{ color: c.orange }}
                        >
                          #{d.leaderboardRank}
                        </AppText>{" "}
                        on the leaderboard
                      </AppText>
                    </View>
                  )}

                  {leaderboard.leaderboard?.map((u, i) => {
                    const ts2 =
                      TIER_STYLES[u.tier?.replace(/[^A-Z]/g, "")] ||
                      TIER_STYLES.BRONZE;
                    const medal =
                      i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `#${u.rank}`;
                    return (
                      <View
                        key={i}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 13,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: c.border,
                          gap: 10,
                          borderRadius: 8,
                          paddingHorizontal: 4,
                          marginBottom: 2,
                          backgroundColor: u.isMe
                            ? "rgba(249,115,22,0.08)"
                            : "transparent",
                        }}
                      >
                        <AppText
                          style={{
                            fontSize: 20,
                            width: 32,
                            textAlign: "center",
                          }}
                        >
                          {medal}
                        </AppText>
                        <Avatar name={u.name} avatar={u.avatar} c={c} />
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
                                  YOU
                                </AppText>
                              </View>
                            )}
                          </View>
                          <TierBadge
                            tier={u.tier?.replace(/[^A-Z]/g, "") || "BRONZE"}
                          />
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <AppText
                            variant="body"
                            weight="semibold"
                            style={{ color: c.text }}
                          >
                            {u.referrals} referrals
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
                      }}
                    >
                      TIER REQUIREMENTS
                    </AppText>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                    >
                      {leaderboard.tiers?.map((t) => {
                        const ts3 = TIER_STYLES[t.key] || TIER_STYLES.BRONZE;
                        return (
                          <View
                            key={t.key}
                            style={{
                              borderRadius: 12,
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
                                fontSize: 13,
                                marginBottom: 4,
                              }}
                            >
                              {t.label}
                            </AppText>
                            <AppText variant="small" tone="dim">
                              {t.minReferrals}+ referrals
                            </AppText>
                            <AppText variant="small" tone="dim">
                              Worker: {fmtAmt(t.workerBonus)}
                            </AppText>
                            <AppText variant="small" tone="dim">
                              Hirer: {fmtAmt(t.hirerBonus)}
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

      {/* WithdrawModal lives OUTSIDE ScrollView but inside the <> fragment */}
      <WithdrawModal
        visible={showWd}
        wallet={d?.wallet}
        onClose={() => setShowWd(false)}
        onSuccess={load}
        c={c}
        modalBg={modalBg}
        toast={toast}
      />
    </>
  );
}
