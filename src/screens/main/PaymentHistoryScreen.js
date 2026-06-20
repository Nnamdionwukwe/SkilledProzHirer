// src/screens/main/PaymentHistoryScreen.js
// Mirrors the website's HirerPaymentHistory component exactly.
// Endpoint: GET /payments/hirer  (with status/currency/page filters)

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import AppText from "../../components/AppText";
import ConfirmModal from "../../components/ConfirmModal";
import CurrencyPicker from "../../components/CurrencyPicker";
import { getHirerPayments, releasePayment } from "../../api/payments";
import { useCurrency } from "../../contexts/CurrencyContext";

// ── Currency symbol lookup ────────────────────────────────────────────────────
const CURRENCY_SYMBOL = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  ZAR: "R",
  INR: "₹",
  CAD: "CA$",
  AUD: "A$",
  JPY: "¥",
  CNY: "¥",
  BRL: "R$",
  AED: "د.إ",
  SAR: "﷼",
  USDC: "◈",
  USDT: "₮",
};

function getCurrencySymbol(currencyCode) {
  if (!currencyCode) return "DH"; // Fix: Return default symbol for undefined
  return CURRENCY_SYMBOL[currencyCode] || currencyCode;
}

// Helper function to format amount with symbol only
function formatWithSymbol(amount, currencyCode) {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${Number(amount ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META = {
  HELD: { label: "In Escrow", color: "#f97316" },
  RELEASED: { label: "Released", color: "#22c55e" },
  PENDING: { label: "Pending", color: "#f97316" },
  REFUNDED: { label: "Refunded", color: "#6366f1" },
  FAILED: { label: "Failed", color: "#ef4444" },
};

const BOOKING_STATUS_META = {
  COMPLETED: { label: "Completed", color: "#22c55e" },
  IN_PROGRESS: { label: "In Progress", color: "#6366f1" },
  CANCELLED: { label: "Cancelled", color: "#ef4444" },
  DISPUTED: { label: "Disputed", color: "#f97316" },
};

const STATUS_TABS = [
  "ALL",
  "HELD",
  "RELEASED",
  "PENDING",
  "REFUNDED",
  "FAILED",
];
const LIMIT = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Receipt Modal
// ─────────────────────────────────────────────────────────────────────────────
function ReceiptModal({ payment, onClose, c, modalBg }) {
  if (!payment) return null;

  const { booking } = payment;
  const hirer = booking?.hirer ?? {};
  const worker = booking?.worker ?? {};
  const meta = STATUS_META[payment.status] ?? {
    label: payment.status,
    color: "#888",
  };

  // Platform fee is 5% - worker gets 100%
  const platformFeePercent = 5;
  const workerPayout = payment.workerPayout ?? payment.amount * 0.95;
  const platformFee = payment.platformFee ?? payment.amount * 0.05;

  const isCrypto = ["USDC", "USDT"].includes(payment.currency);

  const formatAmount = (amount, currency) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${Number(amount ?? 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop]} onPress={onClose}>
        <Pressable
          style={[
            styles.receiptSheet,
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.receiptHeader}>
              <View style={styles.receiptLogoRow}>
                <View style={[styles.logoMark, { backgroundColor: c.orange }]}>
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: "#fff" }}
                  >
                    SP
                  </AppText>
                </View>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ marginLeft: 8 }}
                >
                  SkilledPro
                </AppText>
              </View>
              <Pressable
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText variant="body" tone="dim">
                  ✕
                </AppText>
              </Pressable>
            </View>

            {/* Title + status */}
            <View style={styles.receiptTitleRow}>
              <AppText variant="title" weight="semibold">
                Payment Receipt
              </AppText>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: `${meta.color}22`,
                    borderColor: `${meta.color}55`,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </AppText>
              </View>
            </View>

            {/* Meta grid */}
            <View
              style={[
                styles.metaGrid,
                { borderColor: c.border, backgroundColor: c.bgInput },
              ]}
            >
              {[
                {
                  label: "RECEIPT ID",
                  value: `#${payment.id.slice(0, 12).toUpperCase()}`,
                },
                { label: "DATE", value: fmtDateTime(payment.createdAt) },
                { label: "PROVIDER", value: payment.provider ?? "—" },
                payment.providerRef && {
                  label: "REF",
                  value: payment.providerRef,
                },
              ]
                .filter(Boolean)
                .map((row) => (
                  <View key={row.label} style={styles.metaItem}>
                    <AppText
                      variant="small"
                      tone="dim"
                      style={styles.metaLabel}
                    >
                      {row.label}
                    </AppText>
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={styles.metaValue}
                      numberOfLines={2}
                    >
                      {row.value}
                    </AppText>
                  </View>
                ))}
            </View>

            <View style={[styles.divider, { backgroundColor: c.border }]} />

            {/* Parties */}
            <View style={styles.partiesRow}>
              <View style={styles.partyBox}>
                <AppText variant="small" tone="dim" style={styles.partyLabel}>
                  FROM (HIRER)
                </AppText>
                <AppText variant="body" weight="semibold">
                  {hirer.firstName} {hirer.lastName}
                </AppText>
                {hirer.email && (
                  <AppText variant="small" tone="dim">
                    {hirer.email}
                  </AppText>
                )}
              </View>
              <AppText
                variant="title"
                style={{ color: c.orange, marginHorizontal: 8 }}
              >
                →
              </AppText>
              <View style={styles.partyBox}>
                <AppText variant="small" tone="dim" style={styles.partyLabel}>
                  TO (WORKER)
                </AppText>
                <AppText variant="body" weight="semibold">
                  {worker.firstName} {worker.lastName}
                </AppText>
                {worker.email && (
                  <AppText variant="small" tone="dim">
                    {worker.email}
                  </AppText>
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: c.border }]} />

            {/* Job details */}
            {booking && (
              <View style={styles.jobSection}>
                <AppText variant="small" tone="dim" style={styles.sectionLabel}>
                  JOB
                </AppText>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ marginTop: 4 }}
                >
                  {booking.title}
                </AppText>
                {booking.category?.name && (
                  <View
                    style={[
                      styles.catChip,
                      { backgroundColor: c.orangeDim, borderColor: c.orange },
                    ]}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: c.orange }}
                    >
                      {booking.category.name}
                    </AppText>
                  </View>
                )}
                {booking.scheduledAt && (
                  <AppText variant="small" tone="dim" style={{ marginTop: 6 }}>
                    Scheduled: {fmtDate(booking.scheduledAt)}
                  </AppText>
                )}
                {booking.completedAt && (
                  <AppText variant="small" tone="dim">
                    Completed: {fmtDate(booking.completedAt)}
                  </AppText>
                )}
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: c.border }]} />

            {/* Breakdown */}
            <View style={[styles.breakdown, { borderColor: c.border }]}>
              <View style={styles.breakdownRow}>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: "#22c55e" }}
                >
                  Worker's earnings (100%)
                </AppText>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: "#22c55e" }}
                >
                  {formatAmount(workerPayout, payment.currency)}
                </AppText>
              </View>
              <View style={styles.breakdownRow}>
                <AppText variant="body" tone="dim">
                  Platform fee (5%)
                </AppText>
                <AppText variant="body" style={{ color: "#f97316" }}>
                  + {formatAmount(platformFee, payment.currency)}
                </AppText>
              </View>
              <View
                style={[styles.breakdownTotal, { borderTopColor: c.border }]}
              >
                <AppText variant="body" weight="semibold">
                  Total you paid
                </AppText>
                <AppText
                  variant="display"
                  weight="displayBlack"
                  style={{ color: c.orange, fontSize: 26 }}
                >
                  {formatAmount(payment.amount, payment.currency)}
                </AppText>
              </View>
            </View>

            {/* Worker gets 100% note */}
            <View
              style={[
                styles.workerNote,
                {
                  backgroundColor: "rgba(34,197,94,0.08)",
                  borderColor: "rgba(34,197,94,0.2)",
                },
              ]}
            >
              <AppText style={{ fontSize: 16, marginRight: 8 }}>✅</AppText>
              <AppText variant="small" tone="dim" style={{ flex: 1 }}>
                Worker receives{" "}
                <AppText weight="semibold" style={{ color: "#22c55e" }}>
                  100%
                </AppText>{" "}
                of the job amount (
                {formatAmount(workerPayout, payment.currency)})
              </AppText>
            </View>

            {/* Currency badge */}
            <View style={styles.currencyBadgeRow}>
              <View
                style={[
                  styles.currencyBadge,
                  {
                    backgroundColor: isCrypto
                      ? "rgba(139,92,246,0.12)"
                      : c.orangeDim,
                    borderColor: isCrypto ? "#a78bfa" : c.orange,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: isCrypto ? "#a78bfa" : c.orange }}
                >
                  {payment.currency}
                </AppText>
              </View>
            </View>

            {/* Footer */}
            <View style={[styles.receiptFooter, { borderTopColor: c.border }]}>
              <AppText variant="small" tone="dim">
                SkilledPro · Global Skills Marketplace
              </AppText>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Card - Shows currency symbol only, changes with viewing currency
// ─────────────────────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, accent, c, viewingCurrency }) {
  // Fix: Use a fallback currency if viewingCurrency is undefined
  const safeCurrency = viewingCurrency || "DH";
  const formattedValue = formatWithSymbol(value, safeCurrency);

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: c.bgCard,
          borderColor: accent ? c.orange : c.border,
          borderWidth: accent ? 1 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <AppText
        variant="small"
        weight="semibold"
        tone="dim"
        style={styles.summaryLabel}
      >
        {label.toUpperCase()}
      </AppText>
      <AppText
        variant="display"
        weight={accent ? "displayBlack" : "semibold"}
        style={[styles.summaryValue, { color: accent ? c.orange : c.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formattedValue}
      </AppText>
      {sub && (
        <AppText variant="small" tone="dim">
          {sub}
        </AppText>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Card (list row) - Shows in original payment currency with symbol
// ─────────────────────────────────────────────────────────────────────────────
function PaymentCard({ payment, onReceipt, onRelease, releasing, c }) {
  const payMeta = STATUS_META[payment.status] ?? {
    label: payment.status,
    color: "#888",
  };
  const bookingMeta = BOOKING_STATUS_META[payment.booking?.status] ?? null;
  const worker = payment.booking?.worker ?? {};

  const formatAmount = (amount) => {
    const symbol = getCurrencySymbol(payment.currency);
    return `${symbol}${Number(amount ?? 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <View
      style={[
        styles.payCard,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Job row */}
      <View style={styles.payCardTop}>
        <AppText
          variant="body"
          weight="semibold"
          style={{ flex: 1 }}
          numberOfLines={1}
        >
          {payment.booking?.title ?? "—"}
        </AppText>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: `${payMeta.color}22`,
              borderColor: `${payMeta.color}55`,
            },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: payMeta.color }}
          >
            {payMeta.label}
          </AppText>
        </View>
      </View>

      {/* Category + booking status */}
      <View style={styles.chipRow}>
        {payment.booking?.category?.name && (
          <View
            style={[
              styles.catChip,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <AppText variant="small" tone="dim">
              {payment.booking.category.name}
            </AppText>
          </View>
        )}
        {bookingMeta && (
          <View
            style={[
              styles.catChip,
              {
                backgroundColor: `${bookingMeta.color}22`,
                borderColor: `${bookingMeta.color}55`,
              },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: bookingMeta.color }}
            >
              {bookingMeta.label}
            </AppText>
          </View>
        )}
      </View>

      {/* Worker + date row */}
      <View style={styles.payCardMeta}>
        <View style={styles.workerRow}>
          <View
            style={[
              styles.workerAvatar,
              { backgroundColor: c.orangeDim, borderColor: c.orange },
            ]}
          >
            {worker.avatar ? (
              <Image
                source={{ uri: worker.avatar }}
                style={styles.workerAvatarImg}
              />
            ) : (
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange }}
              >
                {initials(worker.firstName, worker.lastName)}
              </AppText>
            )}
          </View>
          <AppText variant="body" style={{ marginLeft: 8 }}>
            {worker.firstName} {worker.lastName}
          </AppText>
        </View>
        <AppText variant="small" tone="dim">
          {fmtDate(payment.createdAt)}
        </AppText>
      </View>

      {/* Amount row - Shows in original payment currency with symbol */}
      <View style={[styles.amountRow, { borderTopColor: c.border }]}>
        <View>
          <AppText variant="title" weight="semibold" style={styles.amountText}>
            {formatAmount(payment.amount)}
          </AppText>
          <AppText variant="small" style={{ color: "#22c55e" }}>
            Worker gets <AppText weight="semibold">100%</AppText> (
            {formatAmount(payment.workerPayout)})
          </AppText>
          <AppText variant="small" style={{ color: "#f97316", fontSize: 11 }}>
            Platform fee: 5%
          </AppText>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.actionBtn,
              { borderColor: c.border, backgroundColor: c.bgInput },
            ]}
            onPress={() => onReceipt(payment)}
          >
            <AppText variant="small" weight="semibold">
              Receipt
            </AppText>
          </Pressable>
          {payment.status === "HELD" && (
            <Pressable
              style={[
                styles.actionBtn,
                {
                  borderColor: "#22c55e",
                  backgroundColor: "rgba(34,197,94,0.1)",
                },
              ]}
              onPress={() => onRelease(payment.bookingId)}
              disabled={releasing === payment.bookingId}
            >
              {releasing === payment.bookingId ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#22c55e" }}
                >
                  Release
                </AppText>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={{ gap: 12, padding: 16 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.skCard,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function PaymentHistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const toast = useToast();
  const { dashboardCurrency } = useCurrency();

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currFilter, setCurrFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [releasing, setReleasing] = useState(null);
  const [modal, setModal] = useState(null);
  const [viewingCurrency, setViewingCurrency] = useState(
    dashboardCurrency || "DH",
  );

  // ── Log viewingCurrency changes ──────────────────────────────────────────
  useEffect(() => {
    console.log("viewingCurrency changed to:", viewingCurrency);
  }, [viewingCurrency]);

  // ── Sync with dashboardCurrency changes ──────────────────────────────────
  useEffect(() => {
    if (dashboardCurrency) {
      console.log("dashboardCurrency from context:", dashboardCurrency);
      setViewingCurrency(dashboardCurrency);
    }
  }, [dashboardCurrency]);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchPayments = useCallback(
    async (pg = 1, replace = true) => {
      if (replace) setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (statusFilter !== "ALL") params.status = statusFilter;
        if (currFilter !== "ALL") params.currency = currFilter;

        const data = await getHirerPayments(params);
        const list = data.payments ?? [];
        setPayments(replace ? list : (prev) => [...prev, ...list]);
        setTotal(data.total ?? 0);
        setTotalPages(data.pages ?? 1);
        setSummary(data.summary ?? null);
        setCurrencies(data.availableCurrencies ?? []);
      } catch {
        toast.error(t("toast.unknownError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, currFilter],
  );

  useEffect(() => {
    setPage(1);
    fetchPayments(1, true);
  }, [statusFilter, currFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchPayments(1, true);
  };

  // ── Release escrow ──────────────────────────────────────────────────────────
  const handleRelease = (bookingId) => {
    setModal({
      title: "Release Payment",
      message: "Release payment to worker? This confirms the job is complete.",
      confirmLabel: "Release",
      onConfirm: async () => {
        setReleasing(bookingId);
        try {
          await releasePayment(bookingId);
          toast.success("Payment released to worker!");
          setPayments((prev) =>
            prev.map((p) =>
              p.bookingId === bookingId ? { ...p, status: "RELEASED" } : p,
            ),
          );
        } catch (err) {
          toast.error(err?.response?.data?.message ?? t("toast.unknownError"));
        } finally {
          setReleasing(null);
        }
      },
    });
  };

  // ── Filtered (client-side search on top of server filter) ──────────────────
  const visible = payments.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.booking?.title?.toLowerCase().includes(q) ||
      p.booking?.worker?.firstName?.toLowerCase().includes(q) ||
      p.booking?.worker?.lastName?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q)
    );
  });

  // ── Summary values ──────────────────────────────────────────────────────────
  const totalSpent = summary?.totalSpent ?? 0;
  const inEscrow = summary?.inEscrow ?? 0;
  const totalRefunds = summary?.totalRefunds ?? 0;

  // ── Handle currency change ──────────────────────────────────────────────────
  const handleCurrencyChange = (currencyCode) => {
    console.log("Currency selected in PaymentHistory:", currencyCode);
    console.log("Type of currencyCode:", typeof currencyCode);
    if (currencyCode) {
      setViewingCurrency(currencyCode);
    } else {
      // If currencyCode is null/undefined, try to get it from the picker differently
      console.warn("CurrencyPicker returned null/undefined");
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Page Header with Currency Picker */}
            <View style={styles.pageHeader}>
              <View>
                <AppText variant="title" weight="bold" style={styles.pageTitle}>
                  Payment History
                </AppText>
                <AppText variant="small" tone="dim" style={styles.pageSubtitle}>
                  All transactions and receipts
                </AppText>
              </View>
              <View style={styles.headerRight}>
                <CurrencyPicker
                  label="Viewing in"
                  onCurrencyChange={handleCurrencyChange}
                />
              </View>
            </View>

            {/* Summary cards - formatted with viewing currency */}
            <SummaryCard
              label="Total Spent"
              value={totalSpent}
              sub={`${total} transaction${total !== 1 ? "s" : ""}`}
              accent
              c={c}
              viewingCurrency={viewingCurrency}
            />
            <SummaryCard
              label="In Escrow"
              value={inEscrow}
              sub="Awaiting release"
              c={c}
              viewingCurrency={viewingCurrency}
            />
            <SummaryCard
              label="Refunded"
              value={totalRefunds}
              sub="Returned to you"
              c={c}
              viewingCurrency={viewingCurrency}
            />

            {/* Search */}
            <View
              style={[
                styles.searchRow,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText style={{ color: c.textMuted, marginRight: 8 }}>
                🔍
              </AppText>
              <TextInput
                style={[styles.searchInput, { color: c.text }]}
                placeholder="Search by job, worker, or ID…"
                placeholderTextColor={c.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Status filter tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsContent}
            >
              {STATUS_TABS.map((s) => {
                const active = statusFilter === s;
                const label =
                  s === "ALL" ? "All" : (STATUS_META[s]?.label ?? s);
                return (
                  <Pressable
                    key={s}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: active ? c.orange : c.bgCard,
                        borderColor: active ? c.orange : c.border,
                      },
                    ]}
                    onPress={() => {
                      setStatusFilter(s);
                      setPage(1);
                    }}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: active ? "#fff" : c.text }}
                    >
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Currency filter tabs */}
            {currencies.length > 0 && (
              <View style={styles.currencyRow}>
                <AppText
                  variant="small"
                  weight="semibold"
                  tone="dim"
                  style={{ marginRight: 8 }}
                >
                  Currency:
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, flexDirection: "row" }}
                >
                  {["ALL", ...currencies].map((cur) => {
                    const active = currFilter === cur;
                    const symbol = getCurrencySymbol(cur);
                    const label = cur === "ALL" ? "All" : `${symbol} ${cur}`;
                    return (
                      <Pressable
                        key={cur}
                        style={[
                          styles.tab,
                          {
                            backgroundColor: active ? c.orange : c.bgCard,
                            borderColor: active ? c.orange : c.border,
                          },
                        ]}
                        onPress={() => {
                          setCurrFilter(cur);
                          setPage(1);
                        }}
                      >
                        <AppText
                          variant="small"
                          weight="semibold"
                          style={{ color: active ? "#fff" : c.text }}
                        >
                          {label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <PaymentCard
            payment={item}
            onReceipt={setReceipt}
            onRelease={handleRelease}
            releasing={releasing}
            c={c}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <Skeleton c={c} />
          ) : (
            <View style={styles.empty}>
              <AppText variant="title" style={{ textAlign: "center" }}>
                💳
              </AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ textAlign: "center", marginTop: 8 }}
              >
                No transactions yet
              </AppText>
              <AppText
                variant="small"
                tone="dim"
                style={{ textAlign: "center", marginTop: 4 }}
              >
                Your payment history will appear here once you book a worker.
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          !loading && totalPages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                style={[
                  styles.pageBtn,
                  { borderColor: c.border, opacity: page === 1 ? 0.4 : 1 },
                ]}
                disabled={page === 1}
                onPress={() => {
                  const p = page - 1;
                  setPage(p);
                  fetchPayments(p, true);
                }}
              >
                <AppText variant="small" weight="semibold">
                  ← Prev
                </AppText>
              </Pressable>
              <AppText variant="small" tone="dim">
                Page {page} of {totalPages}
              </AppText>
              <Pressable
                style={[
                  styles.pageBtn,
                  {
                    borderColor: c.border,
                    opacity: page === totalPages ? 0.4 : 1,
                  },
                ]}
                disabled={page === totalPages}
                onPress={() => {
                  const p = page + 1;
                  setPage(p);
                  fetchPayments(p, true);
                }}
              >
                <AppText variant="small" weight="semibold">
                  Next →
                </AppText>
              </Pressable>
            </View>
          ) : null
        }
      />

      {/* Receipt modal */}
      <ReceiptModal
        payment={receipt}
        onClose={() => setReceipt(null)}
        c={c}
        modalBg={th.mode === "dark" ? "#111118" : "#ffffff"}
      />

      {/* Confirm modal (for release) */}
      <ConfirmModal
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        confirmLabel={modal?.confirmLabel}
        onConfirm={() => {
          modal?.onConfirm?.();
          setModal(null);
        }}
        onCancel={() => setModal(null)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  listHeader: { gap: 12, marginBottom: 16 },

  // Page Header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  pageSubtitle: {
    fontSize: 13,
  },
  headerRight: {
    flexShrink: 0,
  },

  // Summary cards
  summaryCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  summaryLabel: { letterSpacing: 0.8, marginBottom: 2 },
  summaryValue: {
    fontSize: 28,
    lineHeight: 34,
  },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },

  // Filter tabs
  tabsScroll: { flexGrow: 0 },
  tabsContent: { gap: 6, flexDirection: "row" },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },

  // Payment card
  payCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  payCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    paddingBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexWrap: "wrap",
  },
  payCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  workerRow: { flexDirection: "row", alignItems: "center" },
  workerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  workerAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  amountText: {
    fontSize: 18,
  },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Status / category chips
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },

  // Empty state
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 32,
  },

  // Skeleton
  skCard: {
    height: 120,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },

  // Receipt modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  receiptSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "92%",
    paddingBottom: 32,
  },
  receiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 12,
  },
  receiptLogoRow: { flexDirection: "row", alignItems: "center" },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  metaGrid: {
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: { width: "47%", gap: 2 },
  metaLabel: { letterSpacing: 0.6, marginBottom: 2 },
  metaValue: { fontSize: 12 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  partiesRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 4,
  },
  partyBox: { flex: 1, gap: 2 },
  partyLabel: { letterSpacing: 0.6, marginBottom: 2 },
  jobSection: { paddingHorizontal: 20, gap: 4 },
  sectionLabel: { letterSpacing: 0.8 },
  breakdown: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  workerNote: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  currencyBadgeRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 12,
  },
  currencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  receiptFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
