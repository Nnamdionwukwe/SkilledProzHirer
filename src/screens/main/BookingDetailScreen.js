// src/screens/main/BookingDetailScreen.js
// Shared screen for HIRER and WORKER — role-aware rendering throughout.

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppButton from "../../components/AppButton";
import Card from "../../components/Card";
import ConfirmModal from "../../components/ConfirmModal";
import Avatar from "../../components/Avatar";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import {
  getBooking,
  updateBookingStatus,
  checkIn as checkInApi,
  checkOut as checkOutApi,
  activateSOS as activateSOSApi,
  updateEmergencyContact as saveEmergencyApi,
} from "../../api/bookings";
import {
  createInsuranceCheckout,
  verifyInsuranceCheckout,
} from "../../api/insurance";
import {
  initiatePayment,
  initiateStripeCheckout,
  verifyPaystackPayment,
  initiateBankTransfer,
  confirmBankTransfer,
  initiateCrypto,
  confirmCrypto,
  releasePayment,
} from "../../api/payments";
import { RaiseDisputeSheet } from "./DisputesScreen";

// ─── Status meta (NO t() calls here - these are used inside components) ─────
// These are now functions that accept `t` as a parameter
function getStatusMeta(t) {
  return {
    PENDING: {
      label: t("booking.status.pending"),
      color: "#f97316",
      bg: "rgba(249,115,22,0.15)",
      step: 0,
    },
    ACCEPTED: {
      label: t("booking.status.accepted"),
      color: "#f97316",
      bg: "rgba(249,115,22,0.25)",
      step: 1,
    },
    IN_PROGRESS: {
      label: t("booking.status.inProgress"),
      color: "#6366f1",
      bg: "rgba(99,102,241,0.15)",
      step: 2,
    },
    COMPLETED: {
      label: t("booking.status.completed"),
      color: "#22c55e",
      bg: "rgba(34,197,94,0.12)",
      step: 3,
    },
    CANCELLED: {
      label: t("booking.status.cancelled"),
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
      step: -1,
    },
    DISPUTED: {
      label: t("booking.status.disputed"),
      color: "#f43f5e",
      bg: "rgba(244,63,94,0.12)",
      step: -1,
    },
  };
}

function getPayStatusMeta(t) {
  return {
    PENDING: {
      label: t("booking.payment.pending"),
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.15)",
    },
    HELD: {
      label: t("booking.payment.held"),
      color: "#6366f1",
      bg: "rgba(99,102,241,0.15)",
    },
    RELEASED: {
      label: t("booking.payment.released"),
      color: "#22c55e",
      bg: "rgba(34,197,94,0.15)",
    },
    FAILED: {
      label: t("booking.payment.failed"),
      color: "#ef4444",
      bg: "rgba(239,68,68,0.15)",
    },
    REFUNDED: {
      label: t("booking.payment.refunded"),
      color: "#6b7280",
      bg: "rgba(107,114,128,0.15)",
    },
  };
}

function getTimelineSteps(t) {
  return [
    t("booking.timeline.pending"),
    t("booking.timeline.accepted"),
    t("booking.timeline.inProgress"),
    t("booking.timeline.completed"),
  ];
}

function getLanguages(t) {
  return [
    t("booking.languages.yoruba"),
    t("booking.languages.hausa"),
    t("booking.languages.igbo"),
    t("booking.languages.pidgin"),
    t("booking.languages.french"),
    t("booking.languages.arabic"),
    t("booking.languages.swahili"),
  ];
}

function getCryptoOptions(t) {
  return [
    {
      id: "USDC",
      label: t("booking.crypto.usdc"),
      sub: t("booking.crypto.usdcSub"),
      icon: "$",
    },
    {
      id: "USDT",
      label: t("booking.crypto.usdt"),
      sub: t("booking.crypto.usdtSub"),
      icon: "💵",
    },
    {
      id: "BTC",
      label: t("booking.crypto.btc"),
      sub: t("booking.crypto.btcSub"),
      icon: "₿",
    },
    {
      id: "ETH",
      label: t("booking.crypto.eth"),
      sub: t("booking.crypto.ethSub"),
      icon: "◆",
    },
  ];
}

function getInsurancePlans(t) {
  return [
    {
      id: "basic",
      name: t("booking.insurance.basic"),
      price: 5,
      covers: "$5,000",
      popular: false,
      features: [
        "Property damage up to $5,000",
        "Valid for single booking",
        "24-hour claims support",
        "Instant activation",
      ],
    },
    {
      id: "standard",
      name: t("booking.insurance.standard"),
      price: 12,
      covers: "$15,000",
      popular: true,
      features: [
        "Property damage up to $15,000",
        "Third-party liability included",
        "Priority claims handling",
        "Same-day payouts",
      ],
    },
    {
      id: "premium",
      name: t("booking.insurance.premium"),
      price: 25,
      covers: "$30,000",
      popular: false,
      features: [
        "Property damage up to $30,000",
        "Third-party liability",
        "Worker injury cover",
        "Legal expenses",
        "Dedicated claims agent",
        "Valid for 30 days",
      ],
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(booking) {
  if (!booking) return null;
  const unit = booking.estimatedUnit || "hours";
  const value = booking.estimatedValue;
  const hours = booking.estimatedHours;
  if (!value && !hours) return null;
  if (value) {
    if (unit === "custom") return { main: value, sub: null };
    const labels = {
      hours: "hour",
      days: "day",
      weeks: "week",
      months: "month",
    };
    const num = parseFloat(value);
    const label = (labels[unit] || unit) + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? `≈ ${hours}h` : null;
    return { main: `${num} ${label}`, sub: eqv };
  }
  return hours ? { main: `${hours} hours`, sub: null } : null;
}

function calcEstTotal(booking) {
  const {
    agreedRate: rate,
    estimatedUnit: unit,
    estimatedValue: value,
    currency,
  } = booking;
  if (!rate || !value || !unit || unit === "custom") return null;
  const num = parseFloat(value);
  const suffix =
    { hours: "/hr", days: "/day", weeks: "/wk", months: "/mo" }[unit] || "";
  return { num, unit, rate, total: num * rate, currency, suffix };
}

function fmtTimeDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return (
    dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " · " +
    dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  );
}

function fmtInvoiceDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function invoiceNum(id) {
  return "#SKP-" + (id ?? "").replace(/-/g, "").slice(-8).toUpperCase();
}

// ─── Invoice HTML generator ───────────────────────────────────────────────────
function buildInvoiceHtml(booking) {
  const hirer = booking.hirer ?? {};
  const worker = booking.worker ?? {};
  const category = booking.category?.name ?? "—";
  const dur = formatDuration(booking);
  const currency = booking.currency ?? "USD";
  const amount = Number(
    booking.payment?.amount ?? booking.agreedRate ?? 0,
  ).toLocaleString();
  const fee = Number(
    booking.payment?.platformFee ?? booking.agreedRate * 0.1 ?? 0,
  ).toLocaleString();
  const payout = Number(
    booking.payment?.workerPayout ?? booking.agreedRate * 0.9 ?? 0,
  ).toLocaleString();
  const num = invoiceNum(booking.id);
  const dateStr = fmtInvoiceDate(new Date());
  const schedStr = booking.scheduledAt
    ? new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  const durStr = dur ? (dur.sub ? `${dur.main} (${dur.sub})` : dur.main) : "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 48px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .logo { font-size: 26px; font-weight: 800; }
    .logo-accent { color: #f97316; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 36px; font-weight: 900; color: #f97316; letter-spacing: 2px; }
    .invoice-meta p { color: #666; margin-top: 4px; font-size: 14px; }
    .parties { display: flex; gap: 60px; margin-bottom: 40px; }
    .party-label { font-size: 11px; letter-spacing: 1px; color: #888; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; }
    .party-name { font-size: 18px; font-weight: 700; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th { text-align: left; font-size: 11px; color: #888; letter-spacing: 1px; font-weight: 600; text-transform: uppercase; padding: 0 0 14px 0; border-bottom: 2px solid #e5e7eb; }
    th:last-child, td:last-child { text-align: right; }
    td { padding: 16px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    td:last-child { font-weight: 700; }
    .totals { width: 320px; margin-left: auto; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #444; }
    .total-final { display: flex; justify-content: space-between; padding: 16px 0 0; font-size: 18px; font-weight: 800; border-top: 2px solid #111; margin-top: 8px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 48px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Skilled<span class="logo-accent">Proz</span></div>
    <div class="invoice-meta">
      <div class="invoice-title">INVOICE</div>
      <p>${num}</p>
      <p>Date: ${dateStr}</p>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">Billed To (Hirer)</div>
      <div class="party-name">${hirer.firstName ?? ""} ${hirer.lastName ?? ""}</div>
    </div>
    <div>
      <div class="party-label">Service Provider (Worker)</div>
      <div class="party-name">${worker.firstName ?? ""} ${worker.lastName ?? ""}</div>
    </div>
  </div>

  <hr>

  <table>
    <thead>
      <tr>
        <th>Service</th>
        <th>Category</th>
        <th>Date</th>
        <th>Duration</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${booking.title ?? "—"}</td>
        <td>${category}</td>
        <td>${schedStr}</td>
        <td>${durStr}</td>
        <td>${currency} ${amount}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${currency} ${amount}</span></div>
    <div class="total-row"><span>Platform Fee</span><span>– ${currency} ${fee}</span></div>
    <div class="total-row"><span>Worker Payout</span><span>${currency} ${payout}</span></div>
    <div class="total-final"><span>Total Paid</span><span>${currency} ${amount}</span></div>
  </div>

  <hr>

  <div class="footer">
    <p>SkilledProz Global Skills Marketplace · support@skilledproz.com</p>
    <p>Booking ID: ${booking.id} · Status: ${booking.status}</p>
  </div>
</body>
</html>`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DetailCell({ icon, label, value, accent, c }) {
  const s = styles;
  return (
    <View
      style={[
        s.detailCell,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <AppText style={{ fontSize: 18, lineHeight: 25 }}>{icon}</AppText>
      <AppText variant="small" tone="dim" style={s.cellLabel}>
        {label}
      </AppText>
      <AppText
        variant="body"
        weight="semibold"
        style={accent ? { color: "#f97316" } : {}}
      >
        {value || "—"}
      </AppText>
    </View>
  );
}

function Timeline({ step, c }) {
  const { t } = useTranslation();
  const TIMELINE_STEPS = getTimelineSteps(t);
  const s = styles;

  if (step < 0) return null;
  return (
    <Card padded style={{ marginBottom: 12 }}>
      <View style={s.timeline}>
        {TIMELINE_STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <View key={label} style={s.timelineItem}>
              <View
                style={[
                  s.timelineDot,
                  {
                    borderColor: done || current ? "#f97316" : c.border,
                    backgroundColor: done ? "#f97316" : c.bgCard,
                  },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <AppText
                    style={{
                      color: current ? "#f97316" : c.textMuted,
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    {i + 1}
                  </AppText>
                )}
              </View>
              <AppText
                style={{
                  color: done || current ? c.text : c.textMuted,
                  fontSize: 10,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {label}
              </AppText>
              {i < TIMELINE_STEPS.length - 1 && (
                <View
                  style={[
                    s.timelineLine,
                    { backgroundColor: i < step ? "#f97316" : c.border },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function LocationCard({ label, lat, lng, timestamp, isCheckOut, c }) {
  const dotColor = isCheckOut ? "#ef4444" : "#22c55e";
  const bgColor = isCheckOut ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)";
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const s = styles;

  return (
    <View
      style={[
        s.locCard,
        { backgroundColor: bgColor, borderColor: `${dotColor}44` },
      ]}
    >
      <View style={s.locHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[s.locDot, { backgroundColor: dotColor }]} />
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {label}
          </AppText>
        </View>
        <AppText variant="small" tone="dim">
          {fmtTimeDate(timestamp)}
        </AppText>
      </View>
      <View style={[s.locRow, { borderTopColor: c.border }]}>
        <AppText variant="small" tone="dim">
          {t("booking.location.coordinates")}
        </AppText>
        <AppText variant="small" weight="semibold" style={{ color: c.text }}>
          {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
        </AppText>
      </View>
      <Pressable
        onPress={() => Linking.openURL(mapsUrl)}
        style={{ marginTop: 8 }}
      >
        <AppText variant="small" style={{ color: "#3b82f6" }}>
          {t("booking.location.viewOnMaps")}
        </AppText>
      </Pressable>
    </View>
  );
}

// ─── Language picker modal ────────────────────────────────────────────────────
function LangModal({ visible, selected, onSelect, onClose, c, modalBg }) {
  const { t } = useTranslation();
  const LANGUAGES = getLanguages(t);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable
          style={[
            s.langSheet,
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              {
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.border,
                alignSelf: "center",
                marginBottom: 12,
              },
            ]}
          />
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.text, paddingHorizontal: 20, marginBottom: 12 }}
          >
            {t("booking.translate.selectLanguage")}
          </AppText>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang}
              onPress={() => {
                onSelect(lang);
                onClose();
              }}
              style={[
                s.langOption,
                {
                  borderBottomColor: c.border,
                  backgroundColor:
                    selected === lang ? `${c.orange}15` : "transparent",
                },
              ]}
            >
              <AppText
                variant="body"
                style={{ color: selected === lang ? c.orange : c.text }}
              >
                {lang}
              </AppText>
              {selected === lang && (
                <Ionicons name="checkmark-circle" size={18} color={c.orange} />
              )}
            </Pressable>
          ))}
          <View style={{ height: 20 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";
  const s = styles;

  const bookingId = route.params?.bookingId;

  // Get translated meta inside component
  const STATUS_META = getStatusMeta(t);
  const PAY_STATUS_META = getPayStatusMeta(t);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [modal, setModal] = useState(null);

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  // ── Payment (hirer) ─────────────────────────────────────────────────────────
  const [payMethod, setPayMethod] = useState("card");
  const [selectedCrypto, setSelectedCrypto] = useState("USDC");
  const [showInsurance, setShowInsurance] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [pendingPayRef, setPendingPayRef] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [showBankConfirm, setShowBankConfirm] = useState(false);
  const [bankForm, setBankForm] = useState({ senderName: "", bankName: "" });
  const [cryptoDetails, setCryptoDetails] = useState(null);
  const [showCryptoConfirm, setShowCryptoConfirm] = useState(false);
  const [cryptoForm, setCryptoForm] = useState({
    txHash: "",
    cryptoAmount: "",
  });

  // ── Worker-specific ─────────────────────────────────────────────────────────
  const [emergencyContact, setEmergencyContact] = useState(null);
  const [showEcEdit, setShowEcEdit] = useState(false);
  const [ecForm, setEcForm] = useState({
    name: "",
    phone: "",
    relationship: "",
  });
  const [savingEc, setSavingEc] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);

  // ── Translation ─────────────────────────────────────────────────────────────
  const [translateLang, setTranslateLang] = useState(
    t("booking.languages.yoruba"),
  );
  const [showLangModal, setShowLangModal] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const [translating, setTranslating] = useState(false);

  // ── Misc ────────────────────────────────────────────────────────────────────
  const [disputeVisible, setDisputeVisible] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    getBooking(bookingId)
      .then((b) => {
        setBooking(b);
        // parse emergency contact
        if (b.emergencyContact) {
          try {
            const ec =
              typeof b.emergencyContact === "string"
                ? JSON.parse(b.emergencyContact)
                : b.emergencyContact;
            setEmergencyContact(ec);
            setEcForm({
              name: ec.name || "",
              phone: ec.phone || "",
              relationship: ec.relationship || "",
            });
          } catch {}
        }
        setSosActive(!!b.sosActivatedAt && !b.sosResolvedAt);
      })
      .catch(() => toast.error(t("toast.networkError")))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <AppScreen scrollable={false}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={c.orange} />
        </View>
      </AppScreen>
    );

  if (!booking)
    return (
      <AppScreen scrollable={false}>
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <AppText variant="body" tone="dim" style={{ marginTop: 10 }}>
            {t("bookings.notFound")}
          </AppText>
        </View>
      </AppScreen>
    );

  const meta = STATUS_META[booking.status] ?? STATUS_META.PENDING;
  const payMeta = PAY_STATUS_META[booking.payment?.status] ?? null;
  const step = meta.step ?? 0;
  const isHirer = user?.id === booking.hirerId;
  const isWorker = !isHirer;
  const other = isHirer ? booking.worker : booking.hirer;
  const dur = formatDuration(booking);
  const estTotal = calcEstTotal(booking);
  const scheduled = new Date(booking.scheduledAt);
  const canCancel = ["PENDING", "ACCEPTED"].includes(booking.status);
  const isCompleted = booking.status === "COMPLETED";

  // GPS location flags
  const hasCheckIn = booking.checkInLat && booking.checkInLng;
  const hasCheckOut = booking.checkOutLat && booking.checkOutLng;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const doStatus = async (status, extra = {}) => {
    setActing(true);
    try {
      const updated = await updateBookingStatus(bookingId, status, extra);
      setBooking(updated);
      toast.success(
        t("booking.statusUpdated", {
          status: status.toLowerCase().replace("_", " "),
        }),
      );
      setShowCancel(false);
      setCancelReason("");
    } catch (err) {
      toast.error(err?.response?.data?.message || t("toast.unknownError"));
    } finally {
      setActing(false);
    }
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError(t("bookings.cancelReasonRequired"));
      return;
    }
    doStatus("CANCELLED", { cancelReason: cancelReason.trim() });
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const updated = await checkInApi(bookingId, {});
      setBooking(updated);
      toast.success(t("booking.checkin.success"));
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t("booking.checkin.failed"));
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setModal({
      title: t("booking.checkout.title"),
      message: t("booking.checkout.message"),
      confirmLabel: t("booking.checkout.confirm"),
      onConfirm: async () => {
        setCheckOutLoading(true);
        try {
          const updated = await checkOutApi(bookingId, {});
          setBooking(updated);
          toast.success(t("booking.checkout.success"));
        } catch (err) {
          toast.error(
            err?.response?.data?.message ?? t("booking.checkout.failed"),
          );
        } finally {
          setCheckOutLoading(false);
        }
      },
    });
  };

  const handleSOS = () => {
    Alert.alert(t("booking.sos.title"), t("booking.sos.message"), [
      { text: t("booking.sos.cancel"), style: "cancel" },
      {
        text: t("booking.sos.activate"),
        style: "destructive",
        onPress: async () => {
          setSosLoading(true);
          try {
            const updated = await activateSOSApi(bookingId, {});
            setBooking(updated);
            setSosActive(true);
            toast.success(t("booking.sos.activated"));
          } catch (err) {
            toast.error(
              err?.response?.data?.message ?? t("booking.sos.failed"),
            );
          } finally {
            setSosLoading(false);
          }
        },
      },
    ]);
  };

  const handleSaveEmergency = async () => {
    if (!ecForm.name || !ecForm.phone) {
      toast.error(t("booking.emergency.required"));
      return;
    }
    setSavingEc(true);
    try {
      await saveEmergencyApi(bookingId, ecForm);
      setEmergencyContact({ ...ecForm });
      setShowEcEdit(false);
      toast.success(t("booking.emergency.saved"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? t("booking.emergency.saveFailed"),
      );
    } finally {
      setSavingEc(false);
    }
  };

  const handleTranslate = () => {
    setTranslating(true);
    setTimeout(() => {
      setTranslatedText(t("booking.translate.comingSoon"));
      setTranslating(false);
    }, 800);
  };

  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const html = buildInvoiceHtml(booking);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Invoice",
        });
      } else {
        toast.info("Sharing not available on this device.");
      }
    } catch (err) {
      toast.error("Failed to generate invoice.");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleLeaveReview = async () => {
    if (reviewLoading) return;
    setReviewLoading(true);
    try {
      const reviewerId = user?.id;
      const receiverId = isHirer ? booking.workerId : booking.hirerId;
      await import("../../api/client").then(({ default: client }) =>
        client.post(`/bookings/${bookingId}/reviews`, {
          rating: reviewRating,
          comment: reviewComment,
          reviewerId,
          receiverId,
        }),
      );
      toast.success(t("booking.review.submitted"));
      setReviewModal(false);
      setReviewComment("");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t("booking.review.failed"));
    } finally {
      setReviewLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Back */}
      <Pressable
        onPress={() => navigation.navigate("Bookings")}
        style={s.backBtn}
        hitSlop={8}
      >
        <Ionicons
          name="arrow-back"
          size={16}
          color={c.text}
          style={{ marginRight: 6 }}
        />
        <AppText variant="small">{t("bookings.backToBookings")}</AppText>
      </Pressable>

      {/* TITLE */}
      <Card padded style={{ marginBottom: 12 }}>
        <View style={s.titleRow}>
          <AppText
            variant="display"
            weight="displayBlack"
            style={{ flex: 1, lineHeight: 36 }}
          >
            {booking.title}
          </AppText>
          <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: meta.color }}
            >
              {booking.status.replace("_", " ")}
            </AppText>
          </View>
        </View>
        {booking.category && (
          <View style={[s.catChip, { backgroundColor: c.orangeDim }]}>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange }}
            >
              {booking.category.name}
            </AppText>
          </View>
        )}
      </Card>

      {/* TIMELINE */}
      <Timeline step={step} c={c} />

      {/* DESCRIPTION */}
      <Card padded style={{ marginBottom: 12 }}>
        <AppText
          variant="small"
          weight="semibold"
          tone="dim"
          style={s.sectionLabel}
        >
          {t("booking.section.description")}
        </AppText>
        <AppText variant="body" style={{ marginTop: 8, lineHeight: 22 }}>
          {booking.description}
        </AppText>
        {/* Translation section */}
        {translatedText && (
          <View
            style={[
              s.translateBox,
              { borderColor: c.border, backgroundColor: c.bgPanel },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange, marginBottom: 4 }}
            >
              {translateLang}
            </AppText>
            <AppText
              variant="body"
              style={{ color: c.textMuted, lineHeight: 22 }}
            >
              {translatedText}
            </AppText>
          </View>
        )}
        {/* Translation row */}
        <View style={s.translateRow}>
          <Pressable
            onPress={() => setShowLangModal(true)}
            style={[
              s.langBtn,
              { borderColor: c.border, backgroundColor: c.bgPanel },
            ]}
          >
            <AppText variant="small" style={{ color: c.text }}>
              {translateLang}
            </AppText>
            <Ionicons
              name="chevron-down"
              size={13}
              color={c.textMuted}
              style={{ marginLeft: 4 }}
            />
          </Pressable>
          <Pressable
            onPress={handleTranslate}
            disabled={translating}
            style={[
              s.translateBtn,
              { borderColor: c.border, backgroundColor: c.bgPanel },
            ]}
          >
            {translating ? (
              <ActivityIndicator size="small" color={c.orange} />
            ) : (
              <AppText variant="small" style={{ color: c.text }}>
                {t("booking.translate.button")}
              </AppText>
            )}
          </Pressable>
        </View>
        {booking.notes && (
          <View
            style={[
              s.notesBox,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText variant="small">📝</AppText>
            <AppText
              variant="body"
              tone="dim"
              style={{ flex: 1, marginLeft: 8, lineHeight: 20 }}
            >
              {booking.notes}
            </AppText>
          </View>
        )}
      </Card>

      {/* JOB DETAILS */}
      <Card padded style={{ marginBottom: 12 }}>
        <AppText
          variant="small"
          weight="semibold"
          tone="dim"
          style={s.sectionLabel}
        >
          {t("booking.section.jobDetails")}
        </AppText>
        <View style={s.detailGrid}>
          <DetailCell
            icon="📅"
            label={t("booking.detail.scheduled")}
            value={`${scheduled.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            c={c}
          />
          {booking.address && (
            <DetailCell
              icon="📍"
              label={t("booking.detail.jobSiteAddress")}
              value={booking.address}
              c={c}
            />
          )}
          <DetailCell
            icon="💰"
            label={t("booking.detail.agreedRate")}
            value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
            accent
            c={c}
          />
          {dur && (
            <DetailCell
              icon="⏱️"
              label={t("booking.detail.estDuration")}
              value={dur.sub ? `${dur.main} (${dur.sub})` : dur.main}
              c={c}
            />
          )}
        </View>
        {estTotal && (
          <View
            style={[
              s.totalRow,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText variant="small" tone="dim">
              Est. Total ({estTotal.num} {estTotal.unit} × {estTotal.currency}{" "}
              {Number(estTotal.rate).toLocaleString()}
              {estTotal.suffix})
            </AppText>
            <AppText
              variant="title"
              weight="semibold"
              style={{ color: c.orange, marginTop: 4 }}
            >
              {estTotal.currency} {Number(estTotal.total).toLocaleString()}
            </AppText>
          </View>
        )}
      </Card>

      {/* WORKER LOCATION */}
      {(hasCheckIn || hasCheckOut) && (
        <Card padded style={{ marginBottom: 12 }}>
          <AppText
            variant="small"
            weight="semibold"
            tone="dim"
            style={s.sectionLabel}
          >
            {t("booking.section.workerLocation")}
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ marginBottom: 12, lineHeight: 20 }}
          >
            {t("booking.gpsLocation")}
          </AppText>
          {hasCheckIn && (
            <LocationCard
              label={t("booking.location.checkIn")}
              lat={booking.checkInLat}
              lng={booking.checkInLng}
              timestamp={booking.checkInAt}
              isCheckOut={false}
              c={c}
            />
          )}
          {hasCheckOut && (
            <View style={{ marginTop: 10 }}>
              <LocationCard
                label={t("booking.location.checkOut")}
                lat={booking.checkOutLat}
                lng={booking.checkOutLng}
                timestamp={booking.checkOutAt}
                isCheckOut={true}
                c={c}
              />
            </View>
          )}
        </Card>
      )}

      {/* PAYMENT */}
      {booking.payment && (
        <Card padded style={{ marginBottom: 12 }}>
          <AppText
            variant="small"
            weight="semibold"
            tone="dim"
            style={s.sectionLabel}
          >
            {t("booking.section.payment")}
          </AppText>
          {[
            {
              label: t("booking.detail.total"),
              value: `${booking.payment.currency} ${Number(booking.payment.amount).toLocaleString()}`,
            },
            {
              label: t("booking.detail.platformFee"),
              value: `${booking.payment.currency} ${Number(booking.payment.platformFee).toLocaleString()}`,
              muted: true,
            },
            {
              label: t("booking.detail.workerPayout"),
              value: `${booking.payment.currency} ${Number(booking.payment.workerPayout).toLocaleString()}`,
              green: true,
            },
          ].map((row) => (
            <View
              key={row.label}
              style={[s.payRow, { borderBottomColor: c.border }]}
            >
              <AppText variant="body" tone="dim">
                {row.label}
              </AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{
                  color: row.green
                    ? "#22c55e"
                    : row.muted
                      ? c.textMuted
                      : c.text,
                }}
              >
                {row.value}
              </AppText>
            </View>
          ))}
          {booking.payment.provider && (
            <View style={[s.payRow, { borderBottomColor: c.border }]}>
              <AppText variant="body" tone="dim">
                {t("booking.detail.provider")}
              </AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text }}
              >
                {booking.payment.provider}
              </AppText>
            </View>
          )}
          {payMeta && (
            <View style={[s.payRow, { borderBottomColor: c.border }]}>
              <AppText variant="body" tone="dim">
                {t("booking.detail.status")}
              </AppText>
              <View
                style={[
                  s.payStatusBadge,
                  {
                    backgroundColor: payMeta.bg,
                    borderColor: `${payMeta.color}55`,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    color: payMeta.color,
                    fontWeight: "700",
                  }}
                >
                  {payMeta.label}
                </AppText>
              </View>
            </View>
          )}
          {booking.payment.reference && (
            <View style={[s.payRow, { borderBottomWidth: 0 }]}>
              <AppText variant="body" tone="dim">
                {t("booking.detail.ref")}
              </AppText>
              <AppText
                style={{
                  color: c.textMuted,
                  fontSize: 11,
                  flex: 1,
                  textAlign: "right",
                }}
                numberOfLines={1}
              >
                {booking.payment.reference}
              </AppText>
            </View>
          )}
        </Card>
      )}

      {/* CANCEL REASON */}
      {booking.cancelReason && (
        <Card padded style={{ marginBottom: 12 }}>
          <View
            style={[
              s.cancelReasonBox,
              {
                backgroundColor: "rgba(239,68,68,0.08)",
                borderColor: "#ef4444",
              },
            ]}
          >
            <AppText variant="small">⚠️</AppText>
            <AppText
              variant="body"
              tone="dim"
              style={{ flex: 1, marginLeft: 8 }}
            >
              {booking.cancelReason}
            </AppText>
          </View>
        </Card>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  catChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailGrid: {
    gap: 12,
    marginTop: 8,
  },
  detailCell: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  cellLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  totalRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  timeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  timelineItem: {
    alignItems: "center",
    flex: 1,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    position: "absolute",
    top: 14,
    left: "50%",
    right: "-50%",
    height: 2,
  },
  locCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  locHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  payRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  payStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  translateRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  translateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  translateBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  langSheet: {
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
  },
  langOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelReasonBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
