// src/screens/main/worker/WorkerEarningsScreen.js
// Mirrors: website /worker/earnings
// API: GET /payments/earnings?from=&to=&currency=&page=1&limit=15
//      Returns: { payments, total, pages, summary, availableCurrencies }

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../../../components/AppText";
import Avatar from "../../../components/Avatar";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "react-i18next";
import client from "../../../api/client";
import DateTimePicker from "@react-native-community/datetimepicker";

const LIMIT = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtAmount(currency, amount) {
  if (amount == null) return "—";
  return `${currency ?? ""} ${Number(amount).toLocaleString()}`.trim();
}

// Parse dd/mm/yyyy → ISO date string for API
function parseInputDate(str) {
  if (!str || str.length < 8) return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

// ─── Currency selector modal ─────────────────────────────────────────────────
function CurrencyModal({
  visible,
  currencies,
  selected,
  onSelect,
  onClose,
  c,
  modalBg,
}) {
  const { t } = useTranslation();
  const opts = ["ALL", ...currencies];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={cm.backdrop} onPress={onClose}>
        <Pressable
          style={[
            cm.sheet,
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
            style={{ color: c.text, paddingHorizontal: 20, marginBottom: 10 }}
          >
            {t("workerEarnings.allCurrencies")}
          </AppText>
          {opts.map((cur) => {
            const sel = selected === cur || (cur === "ALL" && !selected);
            return (
              <Pressable
                key={cur}
                onPress={() => {
                  onSelect(cur === "ALL" ? null : cur);
                  onClose();
                }}
                style={[
                  cm.option,
                  {
                    borderBottomColor: c.border,
                    backgroundColor: sel ? `${c.orange}15` : "transparent",
                  },
                ]}
              >
                <AppText
                  variant="body"
                  style={{ color: sel ? c.orange : c.text }}
                >
                  {cur === "ALL" ? t("workerEarnings.allCurrencies") : cur}
                </AppText>
                {sel && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={c.orange}
                  />
                )}
              </Pressable>
            );
          })}
          <View style={{ height: 20 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const cm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

// ─── Currency badge ───────────────────────────────────────────────────────────
function CurrencyBadge({ currency, c }) {
  return (
    <View
      style={[
        cb.badge,
        {
          backgroundColor: "rgba(249,115,22,0.18)",
          borderColor: "rgba(249,115,22,0.5)",
        },
      ]}
    >
      <AppText
        style={{
          fontSize: 11,
          color: c.orange,
          fontWeight: "700",
          letterSpacing: 0.3,
        }}
      >
        ₦ {currency}
      </AppText>
    </View>
  );
}
const cb = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});

// ─── Earning card ─────────────────────────────────────────────────────────────
function EarningCard({ payment, c }) {
  const booking = payment.booking ?? {};
  const hirer = booking.hirer ?? {};
  const cat = booking.category ?? {};
  const cur = payment.currency ?? booking.currency ?? "USD";

  return (
    <View
      style={[ec.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {/* Title */}
      <AppText
        variant="body"
        weight="semibold"
        style={{ color: c.text, marginBottom: 2 }}
      >
        {booking.title ?? "—"}
      </AppText>

      {/* Category */}
      {cat.name && (
        <AppText variant="small" tone="dim" style={{ marginBottom: 8 }}>
          {cat.icon} {cat.name}
        </AppText>
      )}

      {/* Hirer row */}
      <View style={ec.hirerRow}>
        <Avatar
          uri={hirer.avatar}
          firstName={hirer.firstName}
          lastName={hirer.lastName}
          size={28}
        />
        <AppText variant="small" style={{ color: c.text, marginLeft: 8 }}>
          {hirer.firstName} {hirer.lastName}
        </AppText>
      </View>

      {/* Date */}
      <AppText variant="small" tone="dim" style={{ marginBottom: 8 }}>
        {fmtDate(booking.scheduledAt ?? payment.createdAt)}
      </AppText>

      {/* Currency badge */}
      <CurrencyBadge currency={cur} c={c} />

      {/* Amount breakdown */}
      <View style={{ marginTop: 10, gap: 2 }}>
        <AppText variant="small" style={{ color: c.textMuted }}>
          {fmtAmount(cur, payment.amount)}
        </AppText>
        <AppText
          weight="displayBlack"
          style={{ color: "#22c55e", fontSize: 22, lineHeight: 28 }}
        >
          {fmtAmount(cur, payment.workerPayout)}
        </AppText>
        <AppText variant="small" tone="dim">
          {fmtAmount(cur, payment.platformFee)}
        </AppText>
      </View>
    </View>
  );
}
const ec = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  hirerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
});

// ─── Date input styles ──────────────────────────────────────────────────────────
const di = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
  },
});

const dp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    alignItems: "center",
  },
});

// ─── Date input component ──────────────────────────────────────────────────────
function DateInput({ label, value, onChange, placeholder, c }) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      onChange(`${day}/${month}/${year}`);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[di.wrap, { borderColor: c.border, backgroundColor: c.bgCard }]}
      >
        {label ? (
          <AppText
            variant="small"
            tone="dim"
            style={{ marginRight: 6, fontSize: 11 }}
          >
            {label}
          </AppText>
        ) : null}
        <AppText
          style={{ color: value ? c.text : c.textMuted, fontSize: 13, flex: 1 }}
        >
          {value || placeholder}
        </AppText>
        <Ionicons name="calendar-outline" size={14} color={c.textMuted} />
      </Pressable>

      {Platform.OS === "ios" && showPicker && (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable style={dp.overlay} onPress={() => setShowPicker(false)}>
            <View style={[dp.pickerSheet, { backgroundColor: c.bgCard }]}>
              <Pressable
                onPress={() => setShowPicker(false)}
                style={{ alignSelf: "flex-end", padding: 14 }}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  Done
                </AppText>
              </Pressable>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                textColor={c.text}
                style={{ backgroundColor: c.bgCard }}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {Platform.OS === "android" && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}
    </>
  );
}
// ─── Summary stat ─────────────────────────────────────────────────────────────
function SumStat({ label, value, orange, c }) {
  return (
    <View style={{ flex: 1 }}>
      <AppText
        style={{
          fontSize: 9,
          color: c.textMuted,
          letterSpacing: 0.6,
          fontWeight: "700",
        }}
      >
        {label}
      </AppText>
      <AppText
        weight="displayBlack"
        style={{
          fontSize: 20,
          lineHeight: 26,
          color: orange ? c.orange : c.text,
          marginTop: 4,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerEarningsScreen({ navigation }) {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const c = th.colors;
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";

  // ── Data ────────────────────────────────────────────────────────────────────
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [currency, setCurrency] = useState(null); // null = All
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [showCurModal, setShowCurModal] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(
    async (pg = 1, replace = true) => {
      if (replace) setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (currency) params.currency = currency;
        const from = parseInputDate(fromInput);
        const to = parseInputDate(toInput);
        if (from) params.from = from;
        if (to) params.to = to;

        const res = await client.get("/payments/earnings", { params });
        const data = res.data.data;

        setPayments(
          replace ? data.payments : (prev) => [...prev, ...data.payments],
        );
        setSummary(data.summary);
        setTotal(data.total ?? 0);
        setTotalPages(data.pages ?? 1);
        if (data.availableCurrencies?.length)
          setCurrencies(data.availableCurrencies);
        setPage(pg);
      } catch (err) {
        toast.error(
          err?.response?.data?.message ?? t("workerEarnings.loadFail"),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currency, fromInput, toInput],
  );

  useEffect(() => {
    load(1, true);
  }, [currency, fromInput, toInput]);

  const loadMore = () => {
    if (page < totalPages && !loading) load(page + 1, false);
  };

  // ── Summary values ───────────────────────────────────────────────────────────
  const fmtSummary = (val) => {
    if (val == null) return "—";
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${Number(val).toLocaleString()}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(1, true);
            }}
            tintColor={c.orange}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            {/* ── Summary card ── */}
            <View
              style={[
                s.summaryCard,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <SumStat
                label={t("workerEarnings.totalEarned")}
                value={fmtSummary(summary?.totalEarned)}
                orange
                c={c}
              />
              <SumStat
                label={t("workerEarnings.totalJobValue")}
                value={fmtSummary(summary?.totalJobValue)}
                c={c}
              />
              <SumStat
                label={t("workerEarnings.platformFees")}
                value={fmtSummary(summary?.totalFees)}
                c={c}
              />
              <SumStat
                label={t("workerEarnings.transactions")}
                value={String(total)}
                c={c}
              />
            </View>

            {/* ── Filters ── */}
            <View style={s.filterRow}>
              {/* Currency dropdown */}
              <Pressable
                onPress={() => setShowCurModal(true)}
                style={[
                  s.currencyBtn,
                  { borderColor: c.orange, backgroundColor: c.bgCard },
                ]}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text, flex: 1 }}
                >
                  {currency ?? t("workerEarnings.allCurrencies")}
                </AppText>
                <Ionicons name="chevron-down" size={14} color={c.textMuted} />
              </Pressable>

              {/* Date range */}
              <AppText
                variant="small"
                tone="dim"
                style={{ marginHorizontal: 8 }}
              >
                {t("workerEarnings.from")}
              </AppText>
              <DateInput
                label=""
                value={fromInput}
                onChange={setFromInput}
                placeholder={t("workerEarnings.datePlaceholder")}
                c={c}
              />
              <AppText
                variant="small"
                tone="dim"
                style={{ marginHorizontal: 8 }}
              >
                {t("workerEarnings.to")}
              </AppText>
              <DateInput
                label=""
                value={toInput}
                onChange={setToInput}
                placeholder={t("workerEarnings.datePlaceholder")}
                c={c}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => <EarningCard payment={item} c={c} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 60, alignItems: "center" }}>
              <ActivityIndicator size="large" color={c.orange} />
            </View>
          ) : (
            <View style={s.empty}>
              <AppText style={{ fontSize: 48, marginBottom: 14 }}>💸</AppText>
              <AppText
                variant="title"
                weight="semibold"
                style={{ color: c.text, marginBottom: 8 }}
              >
                {t("workerEarnings.noEarnings")}
              </AppText>
              <AppText
                variant="body"
                tone="dim"
                style={{ textAlign: "center" }}
              >
                {t("workerEarnings.noEarningsSub")}
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          page < totalPages ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator color={c.orange} />
            </View>
          ) : payments.length > 0 ? (
            <AppText
              variant="small"
              tone="dim"
              style={{ textAlign: "center", paddingVertical: 16 }}
            >
              All {total} {t("workerEarnings.transactions").toLowerCase()}{" "}
              loaded
            </AppText>
          ) : null
        }
      />

      <CurrencyModal
        visible={showCurModal}
        currencies={currencies}
        selected={currency}
        onSelect={setCurrency}
        onClose={() => setShowCurModal(false)}
        c={c}
        modalBg={modalBg}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  summaryCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
    gap: 4,
  },

  filterRow: { flexDirection: "row", alignItems: "center" },
  currencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flex: 1.2,
    marginRight: 4,
  },

  empty: { paddingVertical: 60, alignItems: "center", paddingHorizontal: 24 },
});
