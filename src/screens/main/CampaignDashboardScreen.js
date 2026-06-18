// src/screens/main/CampaignDashboardScreen.js
// Mirrors: website /referral/campaign (Daily Referral Campaign)
// APIs:
//   GET  /campaign/status           → wallet, stats, today's submission
//   GET  /campaign/referrals        → referrals + task completion
//   GET  /campaign/submissions      → submission history
//   GET  /campaign/my-tasks         → this user's own task status (if referred)
//   POST /campaign/my-tasks/social  → { platform, screenshotUrl? }
//   POST /campaign/submit           → submit daily batch
//   POST /campaign/withdraw         → { amount, bankName, accountNumber, accountName }

import React, { useState, useEffect, useCallback } from "react";
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
  useWindowDimensions,
  RefreshControl,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../../components/AppText";
import Card from "../../components/Card";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_URL = "https://skilledproz.com"; // production deep link base

const TASKS = [
  {
    key: "hasDownloadedApp",
    label: "Download App",
    icon: "📱",
    color: "#60a5fa",
    auto: true,
  },
  {
    key: "hasSetupProfile",
    label: "Setup Profile",
    icon: "👤",
    color: "#a78bfa",
    auto: true,
  },
  {
    key: "hasFollowedFb",
    label: "Follow Facebook",
    icon: "👥",
    color: "#3b82f6",
    platform: "facebook",
  },
  {
    key: "hasFollowedIg",
    label: "Follow Instagram",
    icon: "📸",
    color: "#ec4899",
    platform: "instagram",
  },
  {
    key: "hasFollowedTt",
    label: "Follow TikTok",
    icon: "🎵",
    color: "#ffffff",
    platform: "tiktok",
  },
];

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
    bg: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.18)",
    color: "#ffffff",
  },
};

const SUB_STATUS_COLOR = {
  PENDING: { color: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  REVIEWING: { color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  APPROVED: { color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  PARTIAL: { color: "#60a5fa", bg: "rgba(59,130,246,0.15)" },
  REJECTED: { color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

const REF_STATUS_COLOR = {
  PENDING: { color: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  TASKS_DONE: { color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  SUBMITTED: { color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  APPROVED: { color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  REJECTED: { color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
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
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};
const todayString = () => new Date().toISOString().slice(0, 10);

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, c }) {
  const bgColor =
    accent === "green"
      ? "rgba(34,197,94,0.12)"
      : accent === "orange"
        ? "rgba(249,115,22,0.15)"
        : c.bgPanel;
  const bdColor =
    accent === "green"
      ? "rgba(34,197,94,0.35)"
      : accent === "orange"
        ? "rgba(249,115,22,0.40)"
        : c.border;
  const valColor =
    accent === "green" ? "#22c55e" : accent === "orange" ? c.orange : c.text;
  return (
    <View style={[st.card, { backgroundColor: bgColor, borderColor: bdColor }]}>
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
        style={{ fontSize: 20, lineHeight: 26, color: valColor, marginTop: 3 }}
      >
        {value}
      </AppText>
    </View>
  );
}
const st = StyleSheet.create({
  card: { flex: 1, borderRadius: 13, borderWidth: 1, padding: 12 },
});

// ─── Avatar ───────────────────────────────────────────────────────────────────
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
        <View style={{ width: size, height: size, borderRadius: size / 2 }} />
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, colorMap }) {
  const s = colorMap[status] || {
    color: "#6b7280",
    bg: "rgba(107,114,128,0.14)",
  };
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: s.bg,
        borderColor: `${s.color}55`,
      }}
    >
      <AppText style={{ fontSize: 9, fontWeight: "700", color: s.color }}>
        {status?.replace("_", " ")}
      </AppText>
    </View>
  );
}

// ─── Task Pips (5 dots showing task completion) ────────────────────────────────
function TaskPips({ tasks, r }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 5,
      }}
    >
      {tasks.map((t) => (
        <View
          key={t.key}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 1.5,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: r.tasks?.[t.key] ? t.color : "transparent",
            borderColor: r.tasks?.[t.key] ? t.color : "rgba(255,255,255,0.12)",
          }}
        >
          {r.tasks?.[t.key] && (
            <AppText style={{ fontSize: 8, color: "#fff", fontWeight: "800" }}>
              ✓
            </AppText>
          )}
        </View>
      ))}
      <AppText style={{ fontSize: 10, color: "#6b7280", marginLeft: 4 }}>
        {r.tasks?.completedCount ?? 0}/{r.tasks?.totalCount ?? 5}
      </AppText>
    </View>
  );
}

// ─── Social Follow Card ───────────────────────────────────────────────────────
function SocialFollowCard({ task, done, onReport, reporting, link, c }) {
  const [proofUrl, setProofUrl] = useState("");
  const [showProof, setShowProof] = useState(false);
  const pc = PLATFORM_STYLE[task.platform] || PLATFORM_STYLE.facebook;
  const isReporting = reporting === task.platform;

  return (
    <View
      style={[
        sf.card,
        {
          borderColor: done ? "rgba(34,197,94,0.4)" : pc.border,
          backgroundColor: done ? "rgba(34,197,94,0.08)" : pc.bg,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AppText style={{ fontSize: 28, flexShrink: 0 }}>{task.icon}</AppText>
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {task.label}
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
            <AppText
              style={{ fontSize: 11, fontWeight: "700", color: "#22c55e" }}
            >
              ✅ Done
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
                  color: task.platform === "tiktok" ? "#fff" : "#000",
                }}
              >
                Follow
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => onReport(task.platform, proofUrl)}
              disabled={isReporting}
              style={[
                sf.markBtn,
                { borderColor: c.border, backgroundColor: c.bgPanel },
              ]}
            >
              {isReporting ? (
                <ActivityIndicator size="small" color={c.textMuted} />
              ) : (
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  Mark done
                </AppText>
              )}
            </Pressable>
          </View>
        )}
      </View>
      {!done && (
        <View style={{ marginTop: 10 }}>
          <Pressable onPress={() => setShowProof((v) => !v)}>
            <AppText variant="small" tone="dim">
              📎 Add screenshot (optional)
            </AppText>
          </Pressable>
          {showProof && (
            <TextInput
              value={proofUrl}
              onChangeText={setProofUrl}
              placeholder="Paste screenshot URL…"
              placeholderTextColor={c.textMuted}
              style={[
                sf.proofInput,
                {
                  color: c.text,
                  borderColor: c.border,
                  backgroundColor: c.bgCard,
                },
              ]}
            />
          )}
        </View>
      )}
    </View>
  );
}
const sf = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  doneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  markBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  proofInput: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
});

// ─── Submission Card (expandable history item) ────────────────────────────────
function SubmissionCard({ sub, c }) {
  const [open, setOpen] = useState(false);
  const s = SUB_STATUS_COLOR[sub.status] || SUB_STATUS_COLOR.PENDING;

  return (
    <View
      style={[
        sk.card,
        { borderColor: s.color + "44", backgroundColor: c.bgCard },
      ]}
    >
      <Pressable onPress={() => setOpen((o) => !o)} style={sk.topRow}>
        <View style={{ flex: 1 }}>
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.text, marginBottom: 6 }}
          >
            📅 {sub.date}
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                backgroundColor: s.bg,
                borderColor: `${s.color}55`,
              }}
            >
              <AppText
                style={{ fontSize: 9, fontWeight: "700", color: s.color }}
              >
                {sub.status}
              </AppText>
            </View>
            <AppText variant="small" tone="dim">
              {sub.totalSubmitted} submitted
            </AppText>
            {sub.totalApproved > 0 && (
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: "#22c55e" }}
              >
                ✓ {sub.totalApproved}
              </AppText>
            )}
            {sub.totalRejected > 0 && (
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: "#ef4444" }}
              >
                ✗ {sub.totalRejected}
              </AppText>
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
          <AppText tone="dim">{open ? "▲" : "▼"}</AppText>
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
                },
              ]}
            >
              <AppText variant="small" tone="dim">
                📝 Admin: {sub.adminNote}
              </AppText>
            </View>
          )}
          {sub.referrals?.map((r) => {
            const rs = REF_STATUS_COLOR[r.status] || REF_STATUS_COLOR.PENDING;
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
                    backgroundColor: rs.bg,
                    borderColor: `${rs.color}55`,
                  }}
                >
                  <AppText
                    style={{ fontSize: 9, fontWeight: "700", color: rs.color }}
                  >
                    {r.status}
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
const sk = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  expanded: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  adminNote: { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 8 },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

// ─── Withdraw Modal (bottom sheet) ────────────────────────────────────────────
function WithdrawModal({
  visible,
  balance,
  minWithdrawal,
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
  const setPercent = (pct) =>
    setF("amount", (pct === 1 ? balance : balance * pct).toFixed(0));

  async function submit() {
    const amt = parseFloat(form.amount);
    if (!amt || amt < minWithdrawal) {
      toast.error(`Minimum is ${fmtAmt(minWithdrawal)}`);
      return;
    }
    if (amt > balance) {
      toast.error(`Insufficient balance. Available: ${fmtAmt(balance)}`);
      return;
    }
    if (!form.bankName || !form.accountNumber || !form.accountName) {
      toast.error("All bank details are required");
      return;
    }
    setSub(true);
    try {
      await client.post("/campaign/withdraw", form);
      toast.success("Withdrawal submitted! Processing in 1–3 days 💸");
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
                style={{ fontSize: 22, color: c.text }}
              >
                💸 Withdraw Campaign
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
              {/* Balance preview */}
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
                    {fmtAmt(balance)}
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
                    {fmtAmt(minWithdrawal)}
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
                Processed within 1–3 business days
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
export default function CampaignDashboardScreen() {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
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

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [sRes, rRes, subRes, tRes] = await Promise.allSettled([
        client.get("/campaign/status"),
        client.get("/campaign/referrals?limit=50"),
        client.get("/campaign/submissions?limit=30"),
        client.get("/campaign/my-tasks"),
      ]);
      if (sRes.status === "fulfilled") setStatus(sRes.value.data.data);
      if (rRes.status === "fulfilled")
        setReferrals(rRes.value.data.data?.referrals || []);
      if (subRes.status === "fulfilled")
        setSubmissions(subRes.value.data.data?.submissions || []);
      if (tRes.status === "fulfilled") setMyTasks(tRes.value.data.data);
    } catch {
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function copyLink() {
    const link = `${APP_URL}/signup?ref=${user?.referralCode || ""}`;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    const code = user?.referralCode || "";
    const link = `${APP_URL}/signup?ref=${code}`;
    try {
      await Share.share({
        message: `Join SkilledProz! Download the app, sign up with my code ${code} and follow us on social media. I earn ₦100 when you complete all tasks! ${link}`,
        url: link,
      });
    } catch {}
  }

  async function handleSubmit() {
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const res = await client.post("/campaign/submit");
      toast.success(res.data.message || "Submitted for review!");
      await loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function reportFollow(platform, screenshotUrl = "") {
    setReporting(platform);
    try {
      const res = await client.post("/campaign/my-tasks/social", {
        platform,
        screenshotUrl: screenshotUrl || undefined,
      });
      toast.success(
        `${platform} follow recorded${res.data.data?.allDone ? " 🎉 All tasks done!" : ""}!`,
      );
      await loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record");
    } finally {
      setReporting(null);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const st = status;
  const readyCount = st?.stats?.readyToSubmit || 0;
  const alreadyDone = st?.alreadySubmittedToday;
  const canSubmit = readyCount > 0 && !alreadyDone && !submitting;
  const hasMyTasks = myTasks?.hasCampaignReferral;
  const walletBal = st?.wallet?.balance || 0;
  const pendingRefs = referrals.filter((r) => r.status === "PENDING");

  const TABS = [
    { key: "earn", label: "💰 Earn Daily" },
    ...(hasMyTasks ? [{ key: "tasks", label: "✅ My Tasks" }] : []),
    { key: "history", label: "📋 History" },
  ];

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
              DAILY CAMPAIGN
            </AppText>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 32,
                lineHeight: 38,
                color: c.text,
                marginVertical: 4,
              }}
            >
              Refer & Earn Daily
            </AppText>
            <AppText variant="body" tone="dim">
              Earn{" "}
              <AppText weight="semibold" style={{ color: c.orange }}>
                ₦100
              </AppText>{" "}
              for every person who downloads the app, sets up their account, and
              follows us on social media.
            </AppText>
          </View>
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: "rgba(249,115,22,0.15)",
              borderWidth: 1.5,
              borderColor: "rgba(249,115,22,0.4)",
              borderRadius: 20,
            }}
          >
            <AppText
              style={{ fontSize: 13, fontWeight: "800", color: c.orange }}
            >
              💵 ₦100/referral
            </AppText>
          </View>
        </View>

        {/* ── Wallet Card ── */}
        <Card
          padded
          style={{
            marginBottom: 10,
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.3)",
            backgroundColor: "rgba(34,197,94,0.06)",
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              color: "#22c55e",
              fontWeight: "700",
              letterSpacing: 0.8,
              opacity: 0.8,
            }}
          >
            CAMPAIGN WALLET
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 36,
              color: "#22c55e",
              marginTop: 4,
              marginBottom: 2,
            }}
          >
            {fmtAmt(walletBal)}
          </AppText>
          <AppText variant="small" tone="dim" style={{ marginBottom: 14 }}>
            All-time: {fmtAmt(st?.wallet?.lifetimeTotal)}
          </AppText>
          <Pressable
            onPress={() => st?.wallet?.canWithdraw && setShowWd(true)}
            style={{
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: st?.wallet?.canWithdraw ? "#22c55e" : c.bgCard,
              borderWidth: st?.wallet?.canWithdraw ? 0 : 1,
              borderColor: c.border,
            }}
          >
            <AppText
              weight="semibold"
              style={{
                fontSize: 15,
                color: st?.wallet?.canWithdraw ? "#000" : c.textMuted,
              }}
            >
              💸 Withdraw
            </AppText>
          </Pressable>
          {!st?.wallet?.canWithdraw && (
            <AppText
              variant="small"
              tone="dim"
              style={{ textAlign: "center", marginTop: 6 }}
            >
              Need {fmtAmt(st?.wallet?.minWithdrawal)} · You have{" "}
              {fmtAmt(walletBal)}
            </AppText>
          )}
        </Card>

        {/* ── Stats Grid 2×2 ── */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <StatCard
            label="TOTAL REFERRED"
            value={String(st?.stats?.totalReferred ?? 0)}
            c={c}
          />
          <StatCard
            label="READY TODAY"
            value={String(readyCount)}
            accent={readyCount > 0 ? "green" : ""}
            c={c}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <StatCard
            label="TASKS PENDING"
            value={String(st?.stats?.pendingTasks ?? 0)}
            c={c}
          />
          <StatCard
            label="TOTAL EARNED"
            value={fmtAmt(st?.stats?.totalEarnings)}
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
            borderColor: alreadyDone
              ? "rgba(34,197,94,0.4)"
              : canSubmit
                ? c.orange + "99"
                : c.border,
            backgroundColor: alreadyDone
              ? "rgba(34,197,94,0.08)"
              : canSubmit
                ? "rgba(249,115,22,0.08)"
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
            <AppText style={{ fontSize: 28 }}>
              {alreadyDone ? "📤" : canSubmit ? "🚀" : "⏳"}
            </AppText>
            <View style={{ flex: 1 }}>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginBottom: 3 }}
              >
                {alreadyDone
                  ? "Submitted today!"
                  : canSubmit
                    ? `${readyCount} referral${readyCount !== 1 ? "s" : ""} ready — earn ${fmtAmt(readyCount * 100)}!`
                    : pendingRefs.length > 0
                      ? `${pendingRefs.length} referral${pendingRefs.length !== 1 ? "s" : ""} still completing tasks`
                      : "Start referring to earn daily"}
              </AppText>
              <AppText variant="small" tone="dim">
                {alreadyDone
                  ? `${st?.todaySubmission?.totalSubmitted} sent for review · ${st?.todaySubmission?.status}`
                  : canSubmit
                    ? "Submit today's batch for admin review to get paid."
                    : pendingRefs.length > 0
                      ? "Share your code so they can complete all 5 tasks."
                      : "Share your referral code below — earn ₦100 per person."}
              </AppText>
            </View>
            {canSubmit && (
              <Pressable
                onPress={() => setShowConfirm(true)}
                disabled={submitting}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                  backgroundColor: c.orange,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: "#000" }}
                  >
                    Submit →
                  </AppText>
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
            {TABS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: tab === t.key ? c.orange : "transparent",
                  backgroundColor:
                    tab === t.key ? "rgba(249,115,22,0.08)" : "transparent",
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: tab === t.key ? "700" : "600",
                    color: tab === t.key ? c.orange : c.textMuted,
                  }}
                >
                  {t.label}
                </AppText>
              </Pressable>
            ))}
          </View>

          {/* ── EARN TAB ── */}
          {tab === "earn" && (
            <View style={{ padding: 16 }}>
              {/* Code Card */}
              <View
                style={[
                  ec.codeBox,
                  {
                    borderColor: "rgba(249,115,22,0.35)",
                    backgroundColor: "rgba(249,115,22,0.06)",
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
                  }}
                >
                  YOUR REFERRAL CODE
                </AppText>
                <AppText
                  weight="displayBlack"
                  style={{
                    fontSize: 30,
                    color: c.orange,
                    letterSpacing: 2,
                    marginBottom: 4,
                  }}
                >
                  {user?.referralCode || "—"}
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
                  {`${APP_URL}/signup?ref=${user?.referralCode || ""}`}
                </AppText>
                <View
                  style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}
                >
                  <Pressable
                    onPress={copyLink}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
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
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(249,115,22,0.4)",
                      backgroundColor: "rgba(249,115,22,0.10)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Ionicons name="share-outline" size={15} color={c.orange} />
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: c.orange }}
                    >
                      Share
                    </AppText>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `whatsapp://send?text=${encodeURIComponent(`Join SkilledProz! Download, sign up with my code ${user?.referralCode} & follow us. I earn ₦100 per person! ${APP_URL}/signup?ref=${user?.referralCode}`)}`,
                      ).catch(() => {})
                    }
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      backgroundColor: "rgba(37,211,102,0.08)",
                      borderColor: "rgba(37,211,102,0.35)",
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#25d366",
                      }}
                    >
                      WhatsApp
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Use my code ${user?.referralCode} on SkilledProz 👇`)}`,
                      )
                    }
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      backgroundColor: "rgba(0,0,0,0.3)",
                      borderColor: "rgba(231,233,234,0.2)",
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#e7e9ea",
                      }}
                    >
                      Post on X
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
                  HOW TO EARN ₦100 PER PERSON
                </AppText>
                {[
                  {
                    n: "1",
                    icon: "🔗",
                    text: "Share your referral code or link",
                  },
                  {
                    n: "2",
                    icon: "📱",
                    text: "They download & sign up with your code",
                  },
                  {
                    n: "3",
                    icon: "👤",
                    text: "They complete their profile setup",
                  },
                  {
                    n: "4",
                    icon: "📲",
                    text: "They follow us on Facebook, Instagram & TikTok",
                  },
                  {
                    n: "5",
                    icon: "📤",
                    text: "You submit daily — admin verifies — ₦100 credited!",
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
                    <AppText style={{ fontSize: 18 }}>{s.icon}</AppText>
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
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {TASKS.map((t) => (
                  <View
                    key={t.key}
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
                        backgroundColor: t.color,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 7,
                          color: "#fff",
                          fontWeight: "800",
                        }}
                      >
                        ✓
                      </AppText>
                    </View>
                    <AppText variant="small" tone="dim">
                      {t.label}
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
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  All Referrals
                  {referrals.length > 0 && (
                    <AppText
                      variant="body"
                      weight="semibold"
                      style={{ color: c.textMuted }}
                    >
                      {" "}
                      ({referrals.length})
                    </AppText>
                  )}
                </AppText>
              </View>

              {referrals.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <AppText style={{ fontSize: 36, marginBottom: 10 }}>
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
                    style={{ textAlign: "center" }}
                  >
                    Share your code to start earning!
                  </AppText>
                </View>
              ) : (
                referrals.map((r) => (
                  <View
                    key={r.id}
                    style={[
                      ec.refRow,
                      {
                        borderBottomColor: c.border,
                        backgroundColor: c.bgCard,
                      },
                    ]}
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
                          marginTop: 2,
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
                              fontSize: 9,
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
                      <TaskPips tasks={TASKS} r={r} />
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <StatusBadge
                        status={r.status}
                        colorMap={REF_STATUS_COLOR}
                      />
                      {r.status === "APPROVED" && (
                        <AppText
                          weight="semibold"
                          style={{ fontSize: 13, color: "#22c55e" }}
                        >
                          +₦{r.rewardAmount}
                        </AppText>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ── MY TASKS TAB ── */}
          {tab === "tasks" && (
            <View style={{ padding: 16 }}>
              {!hasMyTasks ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <AppText style={{ fontSize: 30, marginBottom: 10 }}>
                    ℹ️
                  </AppText>
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.text, marginBottom: 4 }}
                  >
                    No tasks for you
                  </AppText>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ textAlign: "center" }}
                  >
                    You didn't sign up with a referral code, so you have no
                    tasks to complete.
                  </AppText>
                </View>
              ) : (
                <>
                  {/* Progress bar */}
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
                          width: `${(myTasks.completedCount / myTasks.totalCount) * 100}%`,
                        }}
                      />
                    </View>
                    <AppText
                      variant="body"
                      weight="semibold"
                      style={{ color: c.text }}
                    >
                      {myTasks.completedCount}/{myTasks.totalCount} tasks
                      complete{myTasks.allDone ? " 🎉" : ""}
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
                      }}
                    >
                      <AppText
                        variant="body"
                        weight="semibold"
                        style={{ color: "#22c55e" }}
                      >
                        ✅ All tasks done! Your referrer can now submit you for
                        the ₦100 reward.
                      </AppText>
                    </View>
                  )}

                  {/* Auto tasks (download + profile) */}
                  {myTasks.tasks
                    ?.filter((t) => t.auto)
                    .map((t) => (
                      <View
                        key={t.key}
                        style={[
                          ec.autoRow,
                          {
                            borderBottomColor: c.border,
                            backgroundColor: t.done
                              ? "rgba(34,197,94,0.06)"
                              : c.bgCard,
                          },
                        ]}
                      >
                        <AppText style={{ fontSize: 24 }}>
                          {t.done ? "✅" : "⏳"}
                        </AppText>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <AppText
                            variant="body"
                            weight="semibold"
                            style={{ color: c.text }}
                          >
                            {t.label}
                          </AppText>
                          {t.hint && (
                            <AppText variant="small" tone="dim">
                              {t.hint}
                            </AppText>
                          )}
                        </View>
                        {t.done && (
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
                              Done
                            </AppText>
                          </View>
                        )}
                      </View>
                    ))}

                  {/* Social follow tasks */}
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.text, marginTop: 16, marginBottom: 10 }}
                  >
                    Follow us on social media
                  </AppText>
                  {myTasks.tasks
                    ?.filter((t) => !t.auto)
                    .map((t) => {
                      const taskMeta = TASKS.find((tk) => tk.key === t.key);
                      const platformKey = t.key
                        ?.replace("hasFollowed", "")
                        .toLowerCase();
                      const link = myTasks.social?.[platformKey] || "#";
                      return taskMeta ? (
                        <SocialFollowCard
                          key={t.key}
                          task={taskMeta}
                          done={t.done}
                          onReport={reportFollow}
                          reporting={reporting}
                          link={link}
                          c={c}
                        />
                      ) : null;
                    })}

                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ textAlign: "center", marginTop: 8 }}
                  >
                    📝 Screenshots are optional but help if admin needs to
                    verify.
                  </AppText>
                </>
              )}
            </View>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === "history" && (
            <View style={{ padding: 16 }}>
              {submissions.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <AppText style={{ fontSize: 36, marginBottom: 10 }}>
                    📋
                  </AppText>
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.text, marginBottom: 4 }}
                  >
                    No submissions yet
                  </AppText>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ textAlign: "center" }}
                  >
                    Submit your first daily batch to see history here.
                  </AppText>
                </View>
              ) : (
                submissions.map((s) => (
                  <SubmissionCard key={s.id} sub={s} c={c} />
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
            style={{ backgroundColor: modalBg, borderRadius: 20, padding: 20 }}
          >
            <AppText
              weight="displayBlack"
              style={{ fontSize: 20, color: c.text, marginBottom: 12 }}
            >
              Submit {readyCount} referral{readyCount !== 1 ? "s" : ""}?
            </AppText>
            <AppText variant="body" tone="dim" style={{ marginBottom: 8 }}>
              You are submitting{" "}
              <AppText weight="semibold" style={{ color: c.text }}>
                {readyCount}
              </AppText>{" "}
              referral{readyCount !== 1 ? "s" : ""} for admin review.
            </AppText>
            <AppText variant="body" tone="dim" style={{ marginBottom: 14 }}>
              If approved, you will earn{" "}
              <AppText weight="semibold" style={{ color: c.orange }}>
                {fmtAmt(readyCount * 100)}
              </AppText>
              .
            </AppText>
            <View
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.2)",
                borderRadius: 10,
                padding: 10,
                marginBottom: 18,
              }}
            >
              <AppText variant="small" tone="dim">
                ⚠️ Admin has final say. Any referral that didn't fully complete
                tasks will be declined and deducted.
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
                  Cancel
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
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: "#000" }}
                  >
                    Confirm Submit
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
        minWithdrawal={st?.wallet?.minWithdrawal || 500}
        onClose={() => setShowWd(false)}
        onSuccess={loadAll}
        c={c}
        modalBg={modalBg}
        toast={toast}
      />
    </>
  );
}

// ─── Extra local styles ───────────────────────────────────────────────────────
const ec = StyleSheet.create({
  codeBox: { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 4 },
  refRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 0,
  },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
});
