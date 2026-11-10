// src/screens/main/worker/WorkerEarningsScreen.js
// Verbatim port of pages/worker/dashboard/earnings/Earnings.jsx + Earnings.module.css

import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useCurrency, CURRENCY_META } from "../../../contexts/CurrencyContext";
import { rem } from "../../../constants/theme";
import client from "../../../api/client";

const CRYPTO = ["USDC", "USDT"];
const NGN_FEE = 3;
const FOREIGN_FEE = 6;

const getHirerFeeRate = (currency) => {
  const cur = (currency || "NGN").toUpperCase();
  return cur === "NGN" ? NGN_FEE : FOREIGN_FEE;
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function CurrencyPill({ currency, c }) {
  const isCrypto = CRYPTO.includes(currency);
  const meta = CURRENCY_META[currency];
  return (
    <View
      style={[
        s.pill,
        {
          backgroundColor: isCrypto ? "rgba(139, 92, 246, 0.12)" : c.orangeDim,
          borderColor: isCrypto
            ? "rgba(139, 92, 246, 0.25)"
            : "rgba(249, 115, 22, 0.2)",
        },
      ]}
    >
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: isCrypto ? "#a78bfa" : c.orange,
        }}
      >
        {isCrypto ? "₿" : (meta?.symbol ?? "💱")} {currency}
      </AppText>
    </View>
  );
}

export default function WorkerEarningsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const isMobile = width <= 900;

  const { dashboardCurrency, changeDashboardCurrency, fmt, ALL_CURRENCIES } =
    useCurrency();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeCurrency, setActiveCurrency] = useState("ALL");
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  // Modals
  const [showDateModal, setShowDateModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20 };
      if (from) params.from = from;
      if (to) params.to = to;
      if (activeCurrency !== "ALL") params.currency = activeCurrency;

      const res = await client.get("/payments/earnings", { params });
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  }, [page, activeCurrency, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const {
    payments = [],
    total = 0,
    pages = 1,
    summary = {},
    availableCurrencies = [],
  } = data ?? {};

  const displayCurrency =
    activeCurrency !== "ALL" ? activeCurrency : dashboardCurrency;

  const ngnFeePercent = Math.round(getHirerFeeRate("NGN"));
  const foreignFeePercent = Math.round(getHirerFeeRate("USD"));
  const isSingleCurrency = activeCurrency !== "ALL";
  const singleCurrencyFeePercent = isSingleCurrency
    ? Math.round(getHirerFeeRate(activeCurrency))
    : null;

  const HIRER_FEE_DISPLAY = isSingleCurrency
    ? `${singleCurrencyFeePercent}%`
    : ngnFeePercent === foreignFeePercent
      ? `${ngnFeePercent}%`
      : `${ngnFeePercent}% – ${foreignFeePercent}%`;

  const WORKER_FEE_DISPLAY = "0%";

  const totalEarned = Number(summary.totalEarned) || 0;
  const totalPromised = Number(summary.totalPromised) || 0;
  const stillInEscrow = Math.max(0, totalPromised - totalEarned);

  const applyDateFilter = () => {
    setFrom(tempFrom);
    setTo(tempTo);
    setPage(1);
    setShowDateModal(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={s.page}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Header */}
      <View style={s.pageHeader}>
        <View>
          <AppText
            variant="title"
            weight="displayBlack"
            style={[s.pageTitle, { color: c.text, fontSize: 18 }]}
          >
            Earnings
          </AppText>
          <AppText style={[s.pageSub, { color: c.textDim }]}>
            Your payment history
          </AppText>
        </View>

        {/* Currency Selector Trigger */}
        <Pressable
          onPress={() => setShowCurrencyModal(true)}
          style={[
            s.currencySwitch,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText
            style={{ fontSize: 11, color: c.textMuted, fontWeight: "600" }}
          >
            Viewing in
          </AppText>
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.orange }}>
            {CURRENCY_META[dashboardCurrency]?.symbol} {dashboardCurrency}
          </AppText>
        </Pressable>
      </View>

      {/* Fee Banner */}
      <View
        style={[
          s.feeBanner,
          {
            backgroundColor: "rgba(34, 197, 94, 0.07)",
            borderColor: "rgba(34, 197, 94, 0.25)",
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={22} color={c.green} />
        <View style={s.feeBannerBody}>
          <AppText style={{ fontSize: 13, fontWeight: "800", color: c.green }}>
            You keep 100% of every job
          </AppText>
          <AppText
            style={{
              fontSize: 11,
              color: c.textDim,
              lineHeight: 16,
              marginTop: 2,
            }}
          >
            SkilledProz charges hirers a {HIRER_FEE_DISPLAY} service fee on top
            of your rate (NGN: {ngnFeePercent}%, other currencies:{" "}
            {foreignFeePercent}%). Zero fees are deducted from your earnings.
            Partial releases credit your wallet immediately.
          </AppText>
        </View>
      </View>

      {/* Stats Grid (Separated Floating Cards) */}
      <View style={s.statsWrap}>
        {/* Total Earned */}
        <View
          style={[
            s.statCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={s.glowEffect} />
          <AppText style={s.statLabel}>You Earned</AppText>
          <AppText
            variant="title"
            weight="displayBlack"
            style={[s.statValue, { fontSize: 15, color: c.orange }]}
          >
            {fmt(totalEarned, displayCurrency)}
          </AppText>
          <AppText style={s.statNote}>
            {activeCurrency !== "ALL"
              ? `filtered · ${activeCurrency}`
              : `in ${displayCurrency}`}
          </AppText>
        </View>

        {/* Still in Escrow */}
        <View
          style={[
            s.statCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={s.statLabel}>Still in Escrow</AppText>
          <AppText
            variant="title"
            weight="displayBlack"
            style={[s.statValue, { color: c.text, fontSize: 15 }]}
          >
            {fmt(stillInEscrow, displayCurrency)}
          </AppText>
          <AppText style={s.statNote}>awaiting hirer release</AppText>
        </View>

        {/* Total Contract */}
        <View
          style={[
            s.statCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={s.statLabel}>Total Contract Value</AppText>
          <AppText
            variant="title"
            weight="displayBlack"
            style={[s.statValue, { color: c.textMuted, fontSize: 15 }]}
          >
            {fmt(totalPromised, displayCurrency)}
          </AppText>
          <AppText style={s.statNote}>
            across {total} payment{total === 1 ? "" : "s"}
          </AppText>
        </View>

        {/* Hirers Paid */}
        <View
          style={[
            s.statCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={s.statLabel}>Hirers Paid Total</AppText>
          <AppText
            variant="title"
            weight="displayBlack"
            style={[s.statValue, { color: c.text, fontSize: 15 }]}
          >
            {fmt(summary.totalJobValue, displayCurrency)}
          </AppText>
          <AppText style={s.statNote}>
            incl. {HIRER_FEE_DISPLAY} service fee
          </AppText>
        </View>
      </View>

      {/* Filters Row */}
      <View style={s.filtersRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Pressable
            onPress={() => {
              setActiveCurrency("ALL");
              setPage(1);
            }}
            style={[
              s.currencyTab,
              {
                backgroundColor:
                  activeCurrency === "ALL" ? c.orangeDim : c.bgCard,
                borderColor: activeCurrency === "ALL" ? c.orange : c.border,
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: activeCurrency === "ALL" ? c.orange : c.textDim,
              }}
            >
              All
            </AppText>
          </Pressable>
          {availableCurrencies.map((cur) => (
            <Pressable
              key={cur}
              onPress={() => {
                setActiveCurrency(cur);
                setPage(1);
              }}
              style={[
                s.currencyTab,
                {
                  backgroundColor:
                    activeCurrency === cur ? c.orangeDim : c.bgCard,
                  borderColor: activeCurrency === cur ? c.orange : c.border,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: activeCurrency === cur ? c.orange : c.textDim,
                }}
              >
                {CURRENCY_META[cur]?.symbol || ""} {cur}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginLeft: "auto",
          }}
        >
          {(from || to || activeCurrency !== "ALL") && (
            <Pressable
              onPress={() => {
                setFrom("");
                setTo("");
                setActiveCurrency("ALL");
                setPage(1);
              }}
              style={[
                s.clearBtn,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.2)",
                },
              ]}
            >
              <AppText
                style={{ fontSize: 12, fontWeight: "600", color: c.red }}
              >
                Clear
              </AppText>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              setTempFrom(from);
              setTempTo(to);
              setShowDateModal(true);
            }}
            style={[
              s.dateBtn,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <Ionicons name="calendar-outline" size={14} color={c.textDim} />
            <AppText style={{ fontSize: 12, color: c.textDim }}>
              {from || to ? "Date Applied" : "Date Range"}
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Transactions List (Separated Cards) */}
      {loading ? (
        <View style={{ gap: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={140} radius={14} />
          ))}
        </View>
      ) : error ? (
        <View style={s.emptyState}>
          <Ionicons name="warning" size={20} color={c.red} />
          <AppText style={{ fontSize: 13, color: c.red }}>{error}</AppText>
        </View>
      ) : payments.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons
            name="cash-outline"
            size={40}
            color={c.textMuted}
            style={{ opacity: 0.4 }}
          />
          <AppText
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: c.textDim,
              marginTop: 8,
            }}
          >
            No payments found
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textMuted,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            {activeCurrency !== "ALL"
              ? `No ${activeCurrency} transactions in this period.`
              : "Complete jobs to start earning."}
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {payments.map((p) => {
            const agreedRate = Number(p.workerPayout) || 0;
            const youEarned = Number(p.earned) || 0;
            const inEscrow = Number(p.remaining) || 0;
            const hirerFee = Number(p.platformFee) || 0;
            const releaseCount = Number(p.releaseCount) || 0;
            const isFullyReleased = !!p.isFullyReleased;
            const hasPartial = !isFullyReleased && youEarned > 0;
            const isExpanded = expandedRow === p.id;
            const releaseRows = Array.isArray(p.releases) ? p.releases : [];

            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  releaseRows.length > 0 &&
                  setExpandedRow(isExpanded ? null : p.id)
                }
                style={({ pressed }) => [
                  s.txCard,
                  {
                    backgroundColor: c.bgPanel,
                    borderColor: c.border,
                    opacity: pressed && releaseRows.length > 0 ? 0.92 : 1,
                  },
                ]}
              >
                {/* Card Header: Title & Badge */}
                <View style={s.txTop}>
                  <View style={{ flex: 1 }}>
                    <AppText style={[s.txTitle, { color: c.text }]}>
                      {p.booking?.title ?? "—"}
                    </AppText>
                    <AppText style={[s.txCat, { color: c.textMuted }]}>
                      {p.booking?.category?.icon} {p.booking?.category?.name}
                      {releaseCount > 1 && ` · ${releaseCount} releases`}
                    </AppText>
                  </View>
                  <CurrencyPill currency={p.currency} c={c} />
                </View>

                {/* Client & Date */}
                <View style={s.txMetaRow}>
                  <View style={s.txClient}>
                    <View
                      style={[
                        s.hirerAvatar,
                        { backgroundColor: c.bgCard, borderColor: c.border },
                      ]}
                    >
                      {p.booking?.hirer?.avatar ? (
                        <Image
                          source={{ uri: p.booking.hirer.avatar }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : (
                        <AppText style={{ fontSize: 10, color: c.textMuted }}>
                          {p.booking?.hirer?.firstName?.[0]}
                          {p.booking?.hirer?.lastName?.[0]}
                        </AppText>
                      )}
                    </View>
                    <AppText
                      style={{ fontSize: 13, color: c.textDim }}
                      numberOfLines={1}
                    >
                      {p.booking?.hirer?.firstName} {p.booking?.hirer?.lastName}
                    </AppText>
                  </View>
                  <AppText style={{ fontSize: 13, color: c.textDim }}>
                    {fmtDate(p.createdAt)}
                  </AppText>
                </View>

                {/* Divider */}
                <View style={[s.divider, { backgroundColor: c.border }]} />

                {/* Amounts */}
                <View style={s.txAmounts}>
                  {/* Agreed Rate */}
                  <View style={s.amountCol}>
                    <AppText style={s.amountLabel}>Agreed Rate</AppText>
                    <AppText style={[s.amountValue, { color: c.textDim }]}>
                      {fmt(agreedRate, p.currency)}
                    </AppText>
                  </View>

                  {/* You Earned */}
                  <View style={s.amountCol}>
                    <AppText style={s.amountLabel}>You Earned</AppText>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <AppText style={[s.earnedValue, { color: c.green }]}>
                        {fmt(youEarned, p.currency)}
                      </AppText>
                      {isFullyReleased && (
                        <View
                          style={[
                            s.badge,
                            {
                              backgroundColor: c.greenDim,
                              borderColor: "rgba(34, 197, 94, 0.25)",
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              fontWeight: "800",
                              color: c.green,
                            }}
                          >
                            Paid in full
                          </AppText>
                        </View>
                      )}
                      {hasPartial && (
                        <View
                          style={[
                            s.badge,
                            {
                              backgroundColor: c.orangeDim,
                              borderColor: c.orangeGlow,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              fontWeight: "700",
                              color: c.orange,
                            }}
                          >
                            Released so far
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* In Escrow / Hirer Paid */}
                  <View style={s.amountCol}>
                    <AppText style={s.amountLabel}>
                      {inEscrow > 0 ? "In Escrow" : "Hirer Paid"}
                    </AppText>
                    <AppText
                      style={[
                        s.amountValue,
                        {
                          color: c.textMuted,
                          textDecorationLine:
                            inEscrow > 0 ? "none" : "line-through",
                        },
                      ]}
                    >
                      {fmt(inEscrow > 0 ? inEscrow : hirerFee, p.currency)}
                    </AppText>
                  </View>
                </View>

                {/* Expand Indicator */}
                {releaseRows.length > 0 && (
                  <View style={s.expandRow}>
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: c.textDim,
                      }}
                    >
                      {isExpanded
                        ? "Hide release history"
                        : "View release history"}
                    </AppText>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={c.textDim}
                    />
                  </View>
                )}

                {/* Expanded Release History */}
                {isExpanded && releaseRows.length > 0 && (
                  <View
                    style={[
                      s.releaseHistory,
                      { backgroundColor: c.bgInput, borderColor: c.border },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: c.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        marginBottom: 8,
                      }}
                    >
                      Release history
                    </AppText>
                    {releaseRows.map((r) => (
                      <View
                        key={r.id}
                        style={[s.releaseRow, { borderBottomColor: c.border }]}
                      >
                        <AppText
                          style={{
                            fontSize: 14,
                            fontWeight: "800",
                            color: c.orange,
                          }}
                        >
                          {fmt(Number(r.amount) || 0, r.currency || p.currency)}
                        </AppText>
                        <AppText
                          style={{
                            fontSize: 12,
                            color: c.textDim,
                            flex: 1,
                            marginLeft: 12,
                          }}
                        >
                          {fmtDateTime(r.createdAt)}
                          {r.note ? ` · ${r.note}` : ""}
                        </AppText>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <View style={s.pagination}>
          <Pressable
            disabled={page === 1}
            onPress={() => setPage((p) => p - 1)}
            style={({ pressed }) => [
              s.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: page === 1 ? 0.35 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{ fontSize: 13, color: page === 1 ? c.textDim : c.orange }}
            >
              ← Prev
            </AppText>
          </Pressable>
          <AppText style={{ fontSize: 13, color: c.textDim }}>
            {page} of {pages}
          </AppText>
          <Pressable
            disabled={page === pages}
            onPress={() => setPage((p) => p + 1)}
            style={({ pressed }) => [
              s.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: page === pages ? 0.35 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 13,
                color: page === pages ? c.textDim : c.orange,
              }}
            >
              Next →
            </AppText>
          </Pressable>
        </View>
      )}

      {/* Date Range Modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowDateModal(false)}
          />
          <View
            style={[
              s.modalBox,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText
              variant="title"
              weight="displayBlack"
              style={{ fontSize: 18, color: c.text, marginBottom: 16 }}
            >
              Filter by Date
            </AppText>
            <View style={{ gap: 12, marginBottom: 24 }}>
              <View>
                <AppText
                  style={{ fontSize: 12, color: c.textDim, marginBottom: 6 }}
                >
                  From Date
                </AppText>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={c.textMuted}
                  value={tempFrom}
                  onChangeText={setTempFrom}
                  style={[
                    s.modalInput,
                    {
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                      color: c.text,
                    },
                  ]}
                />
              </View>
              <View>
                <AppText
                  style={{ fontSize: 12, color: c.textDim, marginBottom: 6 }}
                >
                  To Date
                </AppText>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={c.textMuted}
                  value={tempTo}
                  onChangeText={setTempTo}
                  style={[
                    s.modalInput,
                    {
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                      color: c.text,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setShowDateModal(false)}
                style={[
                  s.modalBtn,
                  { borderColor: c.border, backgroundColor: "transparent" },
                ]}
              >
                <AppText
                  style={{ fontSize: 14, fontWeight: "600", color: c.textDim }}
                >
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={applyDateFilter}
                style={[
                  s.modalBtn,
                  { backgroundColor: c.orange, borderColor: c.orange },
                ]}
              >
                <AppText
                  style={{ fontSize: 14, fontWeight: "700", color: c.bg }}
                >
                  Apply
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Currency Selector Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowCurrencyModal(false)}
          />
          <View
            style={[
              s.modalBox,
              {
                backgroundColor: c.bgPanel,
                borderColor: c.border,
                maxHeight: "80%",
              },
            ]}
          >
            <AppText
              variant="title"
              weight="displayBlack"
              style={{ fontSize: 18, color: c.text, marginBottom: 16 }}
            >
              Select Display Currency
            </AppText>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ALL_CURRENCIES.map((cur) => (
                <Pressable
                  key={cur}
                  onPress={() => {
                    changeDashboardCurrency(cur);
                    setShowCurrencyModal(false);
                  }}
                  style={[s.currencyRow, { borderBottomColor: c.border }]}
                >
                  <AppText style={{ fontSize: 16, color: c.text }}>
                    {CURRENCY_META[cur]?.symbol} {cur}
                  </AppText>
                  {dashboardCurrency === cur && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={c.orange}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    padding: rem(1.25),
    paddingBottom: rem(6),
    gap: 16,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  pageSub: {
    fontSize: 13,
    marginTop: 2,
  },
  currencySwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Banner
  feeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  feeBannerBody: {
    flex: 1,
    minWidth: 0,
  },

  // Stats Grid (Separated Floating Cards)
  statsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  glowEffect: {
    position: "absolute",
    top: -40,
    left: -40,
    width: 140,
    height: 140,
    backgroundColor: "rgba(249, 115, 22, 0.1)",
    borderRadius: 70,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#9ca3af",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    lineHeight: 24,
  },
  statNote: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 4,
  },

  // Filters
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  currencyTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Transaction Card (Separated)
  txCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
  },
  txTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  txCat: {
    fontSize: 12,
  },
  txMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  txClient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  hirerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 12,
  },
  txAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  amountCol: {
    flex: 1,
    minWidth: 90,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  earnedValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  badge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  expandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  // Release History
  releaseHistory: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
  },
  releaseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 8,
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  pageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});
