// src/screens/main/worker/WorkerRetainedEmployerDetailScreen.js
// Verbatim port of pages/worker/retained-staff/WorkerEmployerDetail.
//
// Endpoint:
//   GET /retained-staff/me/employers/:id  (retainedStaffApi.getMyEmployment(id))

import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import client from "../../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY — symbol-safe formatter
// ─────────────────────────────────────────────────────────────────────────────
const SYMBOL_MAP = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  GHS: "₵",
  KES: "KSh ",
  ZAR: "R ",
  TZS: "TSh ",
  UGX: "USh ",
  CAD: "CA$",
  AUD: "A$",
  INR: "₹",
  JPY: "¥",
  CNY: "¥",
  BRL: "R$",
  MXN: "MX$",
  AED: "AED ",
  SAR: "SAR ",
  EGP: "E£",
  USDC: "USDC ",
  USDT: "USDT ",
  BTC: "₿ ",
  ETH: "Ξ ",
};

function formatAmount(n) {
  try {
    return new Intl.NumberFormat("en", {
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);
  } catch {
    return String(Number(n) || 0);
  }
}

function fmtMoney(amount, currency = "NGN") {
  const code = String(currency || "NGN").toUpperCase();
  const symbol = SYMBOL_MAP[code];
  const digits = formatAmount(amount);
  return symbol ? `${symbol}${digits}` : `${code} ${digits}`;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS META
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META = {
  ACTIVE: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  PAUSED: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  ENDED: { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
  RELEASED: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  HELD: { color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  PARTIALLY_RELEASED: { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  AWAITING_PAYMENT: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  CANCELLED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  FAILED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

function statusMeta(raw) {
  const s = String(raw || "ACTIVE").toUpperCase();
  return STATUS_META[s] || { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, c }) {
  const color =
    accent === "green" ? c.green : accent === "blue" ? "#3b82f6" : c.orange;
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,

        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 14,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: color,
          opacity: 0.5,
        }}
      />
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </AppText>
      <AppText
        weight="displayBlack"
        style={{ fontSize: 16, color: color, letterSpacing: -0.5 }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
      {sub ? (
        <AppText style={{ fontSize: 10, color: c.textMuted, marginTop: 4 }}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

function SectionCard({ title, c, children }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 20,
        marginBottom: 12,
      }}
    >
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "800",
          color: c.textMuted,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 14,
        }}
      >
        {title}
      </AppText>
      <View>{children}</View>
    </View>
  );
}

function DetailItem({ icon, label, value, c }) {
  if (!value) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={c.orange}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1 }}>
        <AppText
          style={{
            fontSize: 12,
            color: c.textDim,
            fontWeight: "500",
            marginBottom: 2,
          }}
        >
          {label}
        </AppText>
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: c.text,
          }}
        >
          {value}
        </AppText>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerRetainedEmployerDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const c = theme.colors;

  const memberId = route.params?.id;

  const [member, setMember] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDetail = useCallback(async () => {
    if (!memberId) {
      setError(t("workerRetainedEmployerDetail.notFound"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await client.get(`/retained-staff/me/employers/${memberId}`);
      setMember(res.data?.data?.member || null);
      setCycles(res.data?.data?.cycles || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("workerRetainedEmployerDetail.loadFailed"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberId, t]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  // ── Loading ──
  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Ionicons name="arrow-back" size={16} color={c.textDim} />
          <AppText
            style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
          >
            {t("workerRetainedEmployerDetail.back")}
          </AppText>
        </Pressable>
        <Skeleton width="60%" height={26} radius={6} />
        <Skeleton width="40%" height={16} radius={6} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Skeleton width="100%" height={90} radius={14} />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton width="100%" height={90} radius={14} />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton width="100%" height={90} radius={14} />
          </View>
        </View>
        <Skeleton width="100%" height={200} radius={14} />
        <Skeleton width="100%" height={140} radius={14} />
      </ScrollView>
    );
  }

  // ── Error / not found ──
  if (error || !member) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Ionicons name="arrow-back" size={16} color={c.textDim} />
          <AppText
            style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
          >
            {t("workerRetainedEmployerDetail.back")}
          </AppText>
        </Pressable>
        <View
          style={{
            alignItems: "center",
            padding: 60,
            gap: 10,
            backgroundColor: c.bgPanel,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Ionicons name="alert-circle-outline" size={48} color={c.red} />
          <AppText
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
              textAlign: "center",
            }}
          >
            {t("workerRetainedEmployerDetail.errorTitle")}
          </AppText>
          <AppText
            style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}
          >
            {error || t("workerRetainedEmployerDetail.notFound")}
          </AppText>
          <Pressable
            onPress={fetchDetail}
            style={{
              marginTop: 6,
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgCard,
            }}
          >
            <AppText style={{ fontSize: 12, fontWeight: "600", color: c.text }}>
              {t("workerRetainedEmployerDetail.tryAgain")}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Computed financials from cycles ──
  const lifetimeEarned = cycles
    .filter((cy) => cy.status === "RELEASED")
    .reduce((sum, cy) => sum + (cy._sum?.workerPayout || 0), 0);

  const inEscrow = cycles
    .filter((cy) => cy.status === "HELD")
    .reduce((sum, cy) => sum + (cy._sum?.workerPayout || 0), 0);

  const meta = statusMeta(member.status);
  const hirerName = member.hirer
    ? `${member.hirer.firstName || ""} ${member.hirer.lastName || ""}`.trim()
    : "—";

  const employerLabel = member.hirer?.hirerProfile?.companyName || hirerName;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={c.orange}
        />
      }
    >
      {/* Back link */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
          alignSelf: "flex-start",
        }}
      >
        <Ionicons name="arrow-back" size={16} color={c.textDim} />
        <AppText style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}>
          {t("workerRetainedEmployerDetail.back")}
        </AppText>
      </Pressable>

      {/* Header: title + subtitle + status badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              color: c.text,
              letterSpacing: -0.4,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {member.jobTitle || "—"}
          </AppText>
          <AppText style={{ fontSize: 14, color: c.textDim }} numberOfLines={1}>
            {employerLabel}
          </AppText>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: meta.color + "88",
            backgroundColor: meta.bg,
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "800",
              color: meta.color,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {member.status}
          </AppText>
        </View>
      </View>

      {/* Financial summary cards — stacked, one per line */}
      <View
        style={{
          flexDirection: "column",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <StatCard
          label={t("workerRetainedEmployerDetail.stats.baseRate")}
          value={fmtMoney(member.payRate, member.currency)}
          sub={member.payFrequency}
          accent="orange"
          c={c}
        />
        <StatCard
          label={t("workerRetainedEmployerDetail.stats.lifetimeEarned")}
          value={fmtMoney(lifetimeEarned, member.currency)}
          sub={t("workerRetainedEmployerDetail.stats.lifetimeEarnedSub")}
          accent="green"
          c={c}
        />
        <StatCard
          label={t("workerRetainedEmployerDetail.stats.inEscrow")}
          value={fmtMoney(inEscrow, member.currency)}
          sub={t("workerRetainedEmployerDetail.stats.inEscrowSub")}
          accent="blue"
          c={c}
        />
      </View>

      {/* Employment Details */}
      <SectionCard
        title={t("workerRetainedEmployerDetail.sections.employment")}
        c={c}
      >
        <DetailItem
          icon="person-outline"
          label={t("workerRetainedEmployerDetail.fields.employer")}
          value={hirerName}
          c={c}
        />
        <DetailItem
          icon="briefcase-outline"
          label={t("workerRetainedEmployerDetail.fields.employmentType")}
          value={member.employmentType?.replace("_", " ")}
          c={c}
        />
        <DetailItem
          icon="briefcase-outline"
          label={t("workerRetainedEmployerDetail.fields.department")}
          value={member.department}
          c={c}
        />
        <DetailItem
          icon="briefcase-outline"
          label={t("workerRetainedEmployerDetail.fields.employeeNumber")}
          value={member.employeeNumber}
          c={c}
        />
        <DetailItem
          icon="person-outline"
          label={t("workerRetainedEmployerDetail.fields.manager")}
          value={member.managerName}
          c={c}
        />
        <DetailItem
          icon="globe-outline"
          label={t("workerRetainedEmployerDetail.fields.locationType")}
          value={member.locationType?.replace("_", " ")}
          c={c}
        />
        {member.locationType !== "REMOTE" && (
          <DetailItem
            icon="location-outline"
            label={t("workerRetainedEmployerDetail.fields.workLocation")}
            value={member.location}
            c={c}
          />
        )}
      </SectionCard>

      {/* Working Schedule */}
      <SectionCard
        title={t("workerRetainedEmployerDetail.sections.schedule")}
        c={c}
      >
        <DetailItem
          icon="time-outline"
          label={t("workerRetainedEmployerDetail.fields.workDays")}
          value={member.workDays?.join(", ")}
          c={c}
        />
        <DetailItem
          icon="time-outline"
          label={t("workerRetainedEmployerDetail.fields.workingHours")}
          value={
            member.workStart && member.workEnd
              ? `${member.workStart} — ${member.workEnd}${
                  member.timezone ? ` (${member.timezone})` : ""
                }`
              : null
          }
          c={c}
        />
      </SectionCard>

      {/* Notes from employer (public only) */}
      {member.staffNotes?.length > 0 && (
        <SectionCard
          title={t("workerRetainedEmployerDetail.sections.notes")}
          c={c}
        >
          {member.staffNotes.map((note) => (
            <View
              key={note.id}
              style={{
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: c.orange,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {note.category}
                </AppText>
                <AppText style={{ fontSize: 10, color: c.textMuted }}>
                  {formatDate(note.createdAt)}
                </AppText>
              </View>
              <AppText
                style={{ fontSize: 13, color: c.textDim, lineHeight: 20 }}
              >
                {note.body}
              </AppText>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Contact card */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          padding: 20,
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          marginTop: 8,
        }}
      >
        <View style={{ flex: 1, minWidth: 200 }}>
          <AppText
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
              marginBottom: 4,
            }}
          >
            {t("workerRetainedEmployerDetail.contact.title")}
          </AppText>
          <AppText style={{ fontSize: 13, color: c.textDim }}>
            {t("workerRetainedEmployerDetail.contact.body")}
          </AppText>
        </View>
        <Pressable
          onPress={async () => {
            const hirerId = member.hirer?.id;
            if (!hirerId) return;

            // Look for an existing conversation with this hirer.
            let existingConvoId = null;
            try {
              const res = await client.get("/messages/conversations", {
                params: { page: 1, limit: 100, _t: Date.now() },
              });
              const list = res.data?.data?.conversations || [];
              const found = list.find((convo) =>
                (convo.users || []).some((u) => u.userId === hirerId),
              );
              if (found) existingConvoId = found.id;
            } catch {
              // network blip — fall through to `withUserId` and let ChatScreen
              // create the conversation on first send
            }

            if (existingConvoId) {
              // Open the existing thread
              navigation.navigate("Chat", { conversationId: existingConvoId });
            } else {
              // No thread yet — ChatScreen creates one on first Send
              navigation.navigate("Chat", { withUserId: hirerId });
            }
          }}
          disabled={!member.hirer?.id}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 11,
            borderRadius: 10,
            backgroundColor: c.orange,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: member.hirer?.id ? 1 : 0.4,
          }}
        >
          <Ionicons name="chatbubble-outline" size={14} color="#fff" />
          <AppText style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
            {t("workerRetainedEmployerDetail.contact.button")}
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}
