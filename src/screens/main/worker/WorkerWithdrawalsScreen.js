// src/screens/main/worker/WorkerWithdrawalsScreen.js
// Verbatim port of pages/worker/dashboard/withdrawals/WorkerWithdrawals.jsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "react-i18next";
import client from "../../../api/client";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";

const SCREEN_W = Dimensions.get("window").width;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CURRENCY_META = {
  NGN: { symbol: "₦", name: "Naira" },
  GHS: { symbol: "₵", name: "Cedi" },
  KES: { symbol: "KSh", name: "Shilling" },
  ZAR: { symbol: "R", name: "Rand" },
  TZS: { symbol: "TSh", name: "Shilling" },
  UGX: { symbol: "USh", name: "Shilling" },
  USD: { symbol: "$", name: "Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "Pound" },
  CAD: { symbol: "C$", name: "Dollar" },
  AUD: { symbol: "A$", name: "Dollar" },
  INR: { symbol: "₹", name: "Rupee" },
};

const CURRENCY_METHODS = {
  NGN: [
    {
      key: "ng_bank",
      method: "bank_transfer",
      label: "Bank / Fintech",
      icon: "card-outline",
      desc: "GTBank, Kuda, OPay…",
      country: "NG",
      hasBankList: true,
    },
    {
      key: "ng_mtn",
      method: "mobile_money",
      label: "MTN MoMo",
      icon: "phone-portrait-outline",
      desc: "MTN Nigeria",
      country: "NG",
      provider: "MTN",
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      icon: "logo-bitcoin",
      desc: "Stablecoin",
    },
  ],
  GHS: [
    {
      key: "gh_bank",
      method: "bank_transfer",
      label: "Ghana Bank",
      icon: "card-outline",
      desc: "GCB, Ecobank…",
      country: "GH",
      hasBankList: true,
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      icon: "logo-bitcoin",
      desc: "Stablecoin",
    },
  ],
  KES: [
    {
      key: "ke_mpesa",
      method: "mobile_money",
      label: "M-Pesa",
      icon: "phone-portrait-outline",
      desc: "Safaricom",
      country: "KE",
      provider: "mpesa",
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      icon: "logo-bitcoin",
      desc: "Stablecoin",
    },
  ],
};

const INTL_METHODS = [
  {
    key: "intl_bank",
    method: "bank_transfer",
    label: "SWIFT Wire",
    icon: "globe-outline",
    desc: "150+ countries",
    isInternational: true,
  },
  {
    key: "crypto",
    method: "crypto",
    label: "USDC / USDT",
    icon: "logo-bitcoin",
    desc: "Stablecoin",
  },
];

const CRYPTO_NETWORKS = [
  { value: "BSC", label: "BNB Smart Chain (BSC)" },
  { value: "ETH", label: "Ethereum (ERC-20)" },
  { value: "TRC20", label: "Tron (TRC-20)" },
  { value: "POLYGON", label: "Polygon" },
  { value: "SOLANA", label: "Solana" },
];

const CRYPTO_TOKENS = ["USDC", "USDT", "BTC", "ETH"];

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044", type: "commercial" },
  { name: "Ecobank Nigeria", code: "050", type: "commercial" },
  { name: "Fidelity Bank", code: "070", type: "commercial" },
  { name: "First Bank of Nigeria", code: "011", type: "commercial" },
  { name: "FCMB", code: "214", type: "commercial" },
  { name: "GTBank", code: "058", type: "commercial" },
  { name: "UBA", code: "033", type: "commercial" },
  { name: "Union Bank", code: "032", type: "commercial" },
  { name: "Zenith Bank", code: "057", type: "commercial" },
  { name: "Stanbic IBTC", code: "221", type: "commercial" },
  { name: "Sterling Bank", code: "232", type: "commercial" },
  { name: "Wema Bank / ALAT", code: "035", type: "commercial" },
  { name: "Heritage Bank", code: "030", type: "commercial" },
  { name: "Keystone Bank", code: "082", type: "commercial" },
  { name: "Polaris Bank", code: "076", type: "commercial" },
  { name: "Providus Bank", code: "101", type: "commercial" },
  { name: "Kuda Bank", code: "090267", type: "digital" },
  { name: "OPay Digital Services", code: "100004", type: "digital" },
  { name: "PalmPay", code: "100033", type: "digital" },
  { name: "Moniepoint MFB", code: "50515", type: "digital" },
  { name: "Carbon (Paylater)", code: "565", type: "digital" },
  { name: "FairMoney MFB", code: "51318", type: "digital" },
  { name: "9PSB", code: "120001", type: "digital" },
  { name: "MoMo PSB (MTN)", code: "120003", type: "digital" },
  { name: "Airtel Smartcash PSB", code: "120004", type: "digital" },
  { name: "VBank (VFD MFB)", code: "090110", type: "digital" },
  { name: "Sparkle MFB", code: "090325", type: "digital" },
  { name: "Rubies Bank", code: "125", type: "digital" },
  { name: "LAPO Microfinance Bank", code: "090177", type: "microfinance" },
  { name: "RenMoney MFB", code: "090198", type: "microfinance" },
  { name: "NPF Microfinance Bank", code: "090131", type: "microfinance" },
  { name: "NIRSAL MFB", code: "090194", type: "microfinance" },
].sort((a, b) => a.name.localeCompare(b.name));

const BANK_TYPE_COLORS = {
  commercial: "#818cf8",
  digital: "#f97316",
  microfinance: "#22c55e",
  merchant: "#a78bfa",
};

function getStatusMeta(t) {
  return {
    PENDING: {
      label: t("workerWithdrawals.status.pending"),
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.15)",
    },
    PROCESSING: {
      label: t("workerWithdrawals.status.processing"),
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.15)",
    },
    COMPLETED: {
      label: t("workerWithdrawals.status.completed"),
      color: "#22c55e",
      bg: "rgba(34,197,94,0.15)",
    },
    FAILED: {
      label: t("workerWithdrawals.status.failed"),
      color: "#ef4444",
      bg: "rgba(239,68,68,0.15)",
    },
    CANCELLED: {
      label: t("workerWithdrawals.status.cancelled"),
      color: "#6b7280",
      bg: "rgba(107,114,128,0.15)",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmt(amount, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
}

function timeAgo(d, t) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return t("workerWithdrawals.time.minutesAgo", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("workerWithdrawals.time.hoursAgo", { h });
  const days = Math.floor(h / 24);
  if (days < 30) return t("workerWithdrawals.time.daysAgo", { d: days });
  const months = Math.floor(days / 30);
  if (months < 12) return t("workerWithdrawals.time.monthsAgo", { m: months });
  return t("workerWithdrawals.time.yearsAgo", { y: Math.floor(months / 12) });
}

function getMethodsForCurrency(currency) {
  return CURRENCY_METHODS[currency?.toUpperCase()] ?? INTL_METHODS;
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN BOXES
// ─────────────────────────────────────────────────────────────────────────────
function PinInput({ value, onChange, disabled, label, error, c }) {
  const inputRef = useRef();
  return (
    <View style={{ marginBottom: 4 }}>
      {label && (
        <AppText
          style={{
            fontSize: 12,
            color: c.textMuted,
            fontWeight: "600",
            marginBottom: 8,
          }}
        >
          {label}
        </AppText>
      )}
      <Pressable
        onPress={() => !disabled && inputRef.current?.focus()}
        style={{ flexDirection: "row", gap: 10 }}
      >
        {[0, 1, 2, 3].map((i) => {
          const filled = value.length > i;
          const isActive = value.length === i;
          const hasError = !!error;
          return (
            <View
              key={i}
              style={[
                pinSt.box,
                {
                  borderColor: hasError
                    ? "#ef4444"
                    : isActive
                      ? c.orange
                      : filled
                        ? c.orange
                        : c.border,
                  backgroundColor: hasError
                    ? "rgba(239,68,68,0.08)"
                    : filled
                      ? "rgba(249,115,22,0.12)"
                      : c.bgInput,
                  shadowColor: isActive ? c.orange : "transparent",
                  shadowOpacity: isActive ? 0.3 : 0,
                  shadowRadius: 6,
                  elevation: isActive ? 3 : 0,
                  opacity: disabled ? 0.4 : 1,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 22,
                  color: filled ? c.orange : "transparent",
                }}
              >
                ●
              </AppText>
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 4))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          editable={!disabled}
          style={pinSt.hidden}
        />
      </Pressable>
      {error ? (
        <AppText
          style={{
            fontSize: 12,
            color: "#ef4444",
            marginTop: 6,
            fontWeight: "600",
          }}
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
const pinSt = StyleSheet.create({
  box: {
    width: 52,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0 },
});

// ─────────────────────────────────────────────────────────────────────────────
// PIN SETUP
// ─────────────────────────────────────────────────────────────────────────────
function PinSetupScreen({ onDone, c }) {
  const { t } = useTranslation();
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSet() {
    setError("");
    if (newPin.length < 4)
      return setError(t("workerWithdrawals.pin.setup.error.short"));
    if (newPin !== confirmPin)
      return setError(t("workerWithdrawals.pin.setup.error.match"));
    setLoading(true);
    try {
      await client.post("/payments/pin/set", { pin: newPin });
      setSuccess(true);
      setTimeout(onDone, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ??
          t("workerWithdrawals.pin.setup.error.failed"),
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={{ alignItems: "center", padding: 32, gap: 10 }}>
        <Ionicons name="checkmark-circle" size={52} color="#22c55e" />
        <AppText weight="displayBlack" style={{ fontSize: 20, color: c.text }}>
          {t("workerWithdrawals.pin.setup.success")}
        </AppText>
        <AppText style={{ color: c.textMuted }}>
          {t("workerWithdrawals.pin.setup.returning")}
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ padding: 24, gap: 16, alignItems: "center" }}>
      <Ionicons name="lock-closed" size={52} color={c.orange} />
      <AppText
        weight="displayBlack"
        style={{ fontSize: 18, color: c.text, textAlign: "center" }}
      >
        {t("workerWithdrawals.pin.setup.title")}
      </AppText>
      <AppText
        style={{
          color: c.textMuted,
          textAlign: "center",
          lineHeight: 20,
          fontSize: 13,
        }}
      >
        {t("workerWithdrawals.pin.setup.subtitle")}
      </AppText>
      <View style={{ width: "100%", gap: 16 }}>
        <PinInput
          label={t("workerWithdrawals.pin.setup.choose")}
          value={newPin}
          onChange={setNewPin}
          disabled={loading}
          c={c}
        />
        <PinInput
          label={t("workerWithdrawals.pin.setup.confirm")}
          value={confirmPin}
          onChange={setConfirmPin}
          disabled={loading}
          error={error}
          c={c}
        />
      </View>
      <Pressable
        onPress={handleSet}
        disabled={loading || newPin.length < 4 || confirmPin.length < 4}
        style={[
          {
            width: "100%",
            padding: 14,
            borderRadius: 14,
            alignItems: "center",
            backgroundColor: c.orange,
          },
          (loading || newPin.length < 4 || confirmPin.length < 4) && {
            opacity: 0.45,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <AppText weight="semibold" style={{ color: "#fff", fontSize: 14 }}>
            {t("workerWithdrawals.pin.setup.button")}
          </AppText>
        )}
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK PICKER
// ─────────────────────────────────────────────────────────────────────────────
function BankPickerModal({
  visible,
  banks,
  value,
  onSelect,
  onClose,
  c,
  modalBg,
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const filtered = banks.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.includes(search),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: modalBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "85%",
            paddingBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <AppText
              weight="displayBlack"
              style={{ fontSize: 18, color: c.text }}
            >
              {t("workerWithdrawals.bankPicker.title")}
            </AppText>
            <Pressable
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={16} color={c.text} />
            </Pressable>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              margin: 12,
              paddingHorizontal: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgInput,
            }}
          >
            <Ionicons
              name="search"
              size={16}
              color={c.textMuted}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("workerWithdrawals.bankPicker.search", {
                count: banks.length,
              })}
              placeholderTextColor={c.textMuted}
              style={{
                flex: 1,
                color: c.text,
                paddingVertical: 10,
                fontSize: 14,
              }}
              autoFocus
            />
            {search ? (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(b) => b.code}
            renderItem={({ item: b }) => {
              const sel = b.code === value;
              const tc = BANK_TYPE_COLORS[b.type ?? "commercial"] ?? "#818cf8";
              return (
                <Pressable
                  onPress={() => {
                    onSelect(b);
                    onClose();
                    setSearch("");
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    marginHorizontal: 12,
                    marginBottom: 2,
                    borderRadius: 10,
                    backgroundColor: sel
                      ? "rgba(249,115,22,0.12)"
                      : "transparent",
                  }}
                >
                  <AppText
                    style={{
                      flex: 1,
                      color: sel ? c.orange : c.text,
                      fontWeight: sel ? "700" : "400",
                      fontSize: 13,
                    }}
                  >
                    {b.name}
                  </AppText>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <AppText
                      style={{ fontSize: 9, color: tc, fontWeight: "700" }}
                    >
                      {b.type?.toUpperCase()}
                    </AppText>
                    <AppText style={{ fontSize: 10, color: c.textMuted }}>
                      {b.code}
                    </AppText>
                  </View>
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ReceiptModal({ withdrawal, onClose, c, modalBg }) {
  const { t } = useTranslation();
  const STATUS_META = getStatusMeta(t);
  const viewShotRef = useRef(null);

  if (!withdrawal) return null;

  const sm = STATUS_META[withdrawal.status] ?? STATUS_META.PENDING;
  const amount = Number(withdrawal.amount ?? 0);
  const feeRate = 0;
  const feeAmt = 0;
  const netAmt = amount;
  const cur = withdrawal.currency ?? "NGN";

  const handleShare = async () => {
    try {
      // 1. Capture the receipt view as a PNG
      const uri = await viewShotRef.current.capture();

      // 2. Share the image
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share Receipt",
          UTI: "public.png",
        });
      } else {
        // Fallback to React Native's built-in Share (text only, but at least something)
        await Share.share({
          url: uri,
          message: `SkilledProz Withdrawal Receipt\nReference: #${String(
            withdrawal.reference ?? withdrawal.id ?? "",
          )
            .slice(-8)
            .toUpperCase()}`,
        });
      }
    } catch (error) {
      console.log("Share failed:", error);
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.75)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: modalBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            width: "100%",
            maxHeight: "92%",
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
          >
            {/* The ViewShot wrapper captures this entire content */}
            <ViewShot
              ref={viewShotRef}
              options={{ format: "png", quality: 1.0 }}
            >
              <View style={{ backgroundColor: modalBg }}>
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: c.orange,
                        borderRadius: 8,
                        width: 32,
                        height: 32,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AppText
                        style={{
                          color: "#fff",
                          fontWeight: "900",
                          fontSize: 12,
                        }}
                      >
                        SP
                      </AppText>
                    </View>
                    <AppText
                      weight="semibold"
                      style={{ color: c.text, fontSize: 14 }}
                    >
                      SkilledProz
                    </AppText>
                  </View>
                  <Pressable
                    onPress={onClose}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: c.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={16} color={c.text} />
                  </Pressable>
                </View>

                {/* Title & Status */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <AppText
                    weight="displayBlack"
                    style={{ fontSize: 20, color: c.text }}
                  >
                    {t("workerWithdrawals.receipt.title")}
                  </AppText>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                      backgroundColor: sm.bg,
                      borderWidth: 1,
                      borderColor: sm.color + "55",
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        color: sm.color,
                        fontWeight: "700",
                      }}
                    >
                      {sm.label}
                    </AppText>
                  </View>
                </View>

                {/* Meta Grid */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 20,
                    marginBottom: 20,
                  }}
                >
                  <View style={{ width: "45%" }}>
                    <AppText
                      style={{
                        fontSize: 10,
                        color: c.textMuted,
                        fontWeight: "700",
                      }}
                    >
                      {t("workerWithdrawals.receipt.reference")}
                    </AppText>
                    <AppText
                      weight="semibold"
                      style={{ color: c.text, marginTop: 4, fontSize: 13 }}
                    >
                      #
                      {String(withdrawal.reference ?? withdrawal.id ?? "")
                        .slice(-8)
                        .toUpperCase()}
                    </AppText>
                  </View>
                  <View style={{ width: "45%" }}>
                    <AppText
                      style={{
                        fontSize: 10,
                        color: c.textMuted,
                        fontWeight: "700",
                      }}
                    >
                      {t("workerWithdrawals.receipt.method")}
                    </AppText>
                    <AppText
                      weight="semibold"
                      style={{
                        color: c.text,
                        marginTop: 4,
                        fontSize: 13,
                        textTransform: "capitalize",
                      }}
                    >
                      {withdrawal.method?.replace(/_/g, " ") ?? "—"}
                    </AppText>
                  </View>
                  <View style={{ width: "45%" }}>
                    <AppText
                      style={{
                        fontSize: 10,
                        color: c.textMuted,
                        fontWeight: "700",
                      }}
                    >
                      Requested
                    </AppText>
                    <AppText
                      weight="semibold"
                      style={{ color: c.text, marginTop: 4, fontSize: 13 }}
                    >
                      {new Date(withdrawal.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </AppText>
                  </View>
                  {withdrawal.processedAt && (
                    <View style={{ width: "45%" }}>
                      <AppText
                        style={{
                          fontSize: 10,
                          color: c.textMuted,
                          fontWeight: "700",
                        }}
                      >
                        Processed
                      </AppText>
                      <AppText
                        weight="semibold"
                        style={{ color: c.text, marginTop: 4, fontSize: 13 }}
                      >
                        {new Date(withdrawal.processedAt).toLocaleString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </AppText>
                    </View>
                  )}
                  {withdrawal.completedAt && (
                    <View style={{ width: "45%" }}>
                      <AppText
                        style={{
                          fontSize: 10,
                          color: c.textMuted,
                          fontWeight: "700",
                        }}
                      >
                        Completed
                      </AppText>
                      <AppText
                        weight="semibold"
                        style={{ color: c.text, marginTop: 4, fontSize: 13 }}
                      >
                        {new Date(withdrawal.completedAt).toLocaleString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </AppText>
                    </View>
                  )}
                  <View style={{ width: "45%" }}>
                    <AppText
                      style={{
                        fontSize: 10,
                        color: c.textMuted,
                        fontWeight: "700",
                      }}
                    >
                      Currency
                    </AppText>
                    <AppText
                      weight="semibold"
                      style={{ color: c.text, marginTop: 4, fontSize: 13 }}
                    >
                      {cur}
                    </AppText>
                  </View>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: c.border,
                    marginVertical: 16,
                  }}
                />

                {/* Paid To */}
                <View style={{ marginBottom: 16 }}>
                  <AppText
                    style={{
                      fontSize: 10,
                      color: c.textMuted,
                      fontWeight: "700",
                      marginBottom: 4,
                    }}
                  >
                    {t("workerWithdrawals.receipt.paidTo")}
                  </AppText>
                  <AppText
                    style={{ color: c.text, fontSize: 14, fontWeight: "500" }}
                  >
                    {withdrawal.destination ?? withdrawal.accountName ?? "—"}
                  </AppText>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: c.border,
                    marginVertical: 16,
                  }}
                />

                {/* Breakdown */}
                <View style={{ gap: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <AppText style={{ color: c.textMuted, fontSize: 13 }}>
                      {t("workerWithdrawals.receipt.amount")}
                    </AppText>
                    <AppText
                      weight="semibold"
                      style={{ color: c.text, fontSize: 13 }}
                    >
                      {fmt(amount, cur)}
                    </AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <AppText style={{ color: c.textMuted, fontSize: 13 }}>
                      {t("workerWithdrawals.receipt.fee")}
                    </AppText>
                    <AppText
                      weight="semibold"
                      style={{ color: "#22c55e", fontSize: 13 }}
                    >
                      {t("workerWithdrawals.receipt.free")}
                    </AppText>
                  </View>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: c.border,
                    marginVertical: 16,
                  }}
                />

                {/* Total */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24,
                  }}
                >
                  <AppText
                    weight="semibold"
                    style={{ color: c.text, fontSize: 15 }}
                  >
                    {t("workerWithdrawals.receipt.receive")}
                  </AppText>
                  <AppText
                    weight="displayBlack"
                    style={{
                      color: c.orange,
                      fontSize: 24,
                      letterSpacing: -0.5,
                    }}
                  >
                    {fmt(netAmt, cur)}
                  </AppText>
                </View>

                <View style={{ alignItems: "center", marginTop: 16 }}>
                  <AppText style={{ fontSize: 10, color: c.textMuted }}>
                    {t("workerWithdrawals.receipt.footer")}
                  </AppText>
                </View>
              </View>
            </ViewShot>

            {/* Actions (outside the ViewShot so they don't appear in the image) */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                borderTopWidth: 1,
                borderTopColor: c.border,
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <Pressable
                onPress={handleShare}
                style={{
                  flex: 1,
                  backgroundColor: c.orangeDim,
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                }}
              >
                <Ionicons name="share-outline" size={18} color={c.orange} />
                <AppText
                  style={{ color: c.orange, fontSize: 13, fontWeight: "700" }}
                >
                  Share Receipt
                </AppText>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: c.bgCard,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText
                  style={{ color: c.text, fontSize: 13, fontWeight: "600" }}
                >
                  Close
                </AppText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAWAL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function WithdrawalModal({
  visible,
  onClose,
  balance,
  currencyBalances,
  defaultCurrency,
  onSuccess,
  c,
  modalBg,
}) {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState(defaultCurrency ?? "NGN");
  const [selMethod, setSelMethod] = useState(null);
  const [form, setForm] = useState({});
  const [amount, setAmount] = useState("");
  const [banks, setBanks] = useState(NIGERIAN_BANKS);
  const [banksLoading, setBanksLoading] = useState(false);
  const [showBankPick, setShowBankPick] = useState(false);
  const [verifiedName, setVerifiedName] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinStatus, setPinStatus] = useState(null);
  const [pinLoading, setPinLoading] = useState(true);
  const [showPinSetup, setShowPinSetup] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPinLoading(true);
    client
      .get("/payments/pin/status")
      .then((r) => {
        const d = r.data.data;
        setPinStatus(d);
        if (!d.pinSet) setShowPinSetup(true);
      })
      .catch(() =>
        setPinStatus({ pinSet: true, isLocked: false, attemptsRemaining: 3 }),
      )
      .finally(() => setPinLoading(false));
  }, [visible]);

  // Auto-select currency when modal opens with a default
  useEffect(() => {
    if (visible && defaultCurrency) setCurrency(defaultCurrency);
  }, [visible, defaultCurrency]);

  const methods = getMethodsForCurrency(currency);

  useEffect(() => {
    if (methods.length) setSelMethod(methods[0]);
    setForm({});
    setVerifiedName(null);
    setVerifyErr("");
  }, [currency]);

  useEffect(() => {
    if (!selMethod?.hasBankList) {
      setBanks([]);
      return;
    }
    const country = selMethod.country ?? "NG";
    if (country === "NG") {
      setBanks(NIGERIAN_BANKS);
      client
        .get("/payments/banks?country=NG")
        .then((r) => {
          const api = r.data.data?.banks ?? [];
          if (!api.length) return;
          const merged = new Map(NIGERIAN_BANKS.map((b) => [b.code, b]));
          api.forEach((b) =>
            merged.set(b.code, {
              name: b.name,
              code: b.code,
              type: b.type ?? "commercial",
            }),
          );
          setBanks(
            [...merged.values()].sort((a, b) => a.name.localeCompare(b.name)),
          );
        })
        .catch(() => {});
      return;
    }
    setBanksLoading(true);
    client
      .get(`/payments/banks?country=${country}`)
      .then((r) => setBanks(r.data.data?.banks ?? []))
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));
  }, [selMethod]);

  useEffect(() => {
    setVerifiedName(null);
    setVerifyErr("");
  }, [form.accountNumber, form.bankCode]);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function verifyAccount() {
    if (!form.accountNumber || !form.bankCode)
      return setVerifyErr(t("workerWithdrawals.error.selectBankAccount"));
    setVerifying(true);
    setVerifyErr("");
    setVerifiedName(null);
    try {
      const r = await client.post("/payments/verify-account", {
        accountNumber: form.accountNumber,
        bankCode: form.bankCode,
        country: selMethod?.country ?? "NG",
      });
      setVerifiedName(r.data.data.accountName);
    } catch (e) {
      setVerifyErr(
        e.response?.data?.message ??
          t("workerWithdrawals.error.accountNotFound"),
      );
    } finally {
      setVerifying(false);
    }
  }

  const availableForCurrency =
    currencyBalances[currency] ?? balance?.available ?? 0;
  const currMeta = CURRENCY_META[currency] ?? {
    symbol: currency,
    name: currency,
  };

  async function handleSubmit() {
    setError("");
    setPinError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)
      return setError(t("workerWithdrawals.error.validAmount"));
    if (amt > availableForCurrency)
      return setError(
        t("workerWithdrawals.error.exceedsBalance", {
          balance: fmt(availableForCurrency, currency),
        }),
      );
    if (!selMethod) return setError(t("workerWithdrawals.error.selectMethod"));
    if (!pin || pin.length < 4)
      return setPinError(t("workerWithdrawals.modal.pinRequired"));
    if (pinStatus?.isLocked)
      return setPinError(t("workerWithdrawals.modal.pinLocked"));

    const m = selMethod.method;
    if (m === "bank_transfer" && !selMethod.isInternational) {
      if (!form.bankCode)
        return setError(t("workerWithdrawals.error.selectBank"));
      if (!form.accountNumber)
        return setError(t("workerWithdrawals.error.enterAccount"));
      if (!verifiedName)
        return setError(t("workerWithdrawals.error.verifyAccount"));
    }

    const payload = {
      pin,
      amount: amt,
      currency: currency.toUpperCase(),
      method: m,
      country: selMethod.country ?? "INTL",
    };
    if (m === "bank_transfer" && !selMethod.isInternational) {
      Object.assign(payload, {
        bankCode: form.bankCode,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: verifiedName ?? form.accountName,
      });
    } else if (m === "mobile_money") {
      Object.assign(payload, {
        mobileNumber: form.mobileNumber,
        mobileName: form.mobileName ?? "",
        mobileProvider: selMethod.provider ?? form.mobileProvider ?? "",
      });
    } else if (m === "crypto") {
      Object.assign(payload, {
        cryptoAddress: form.cryptoAddress,
        cryptoCurrency: form.cryptoToken ?? "USDT",
        cryptoNetwork: form.cryptoNetwork ?? "BSC",
      });
    }

    setSubmitting(true);
    try {
      await client.post("/payments/withdraw", payload);
      setSuccess(
        t("workerWithdrawals.withdraw.success", { amount: fmt(amt, currency) }),
      );
      onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        t("workerWithdrawals.error.withdrawFailed");
      if (err.response?.status === 401 || msg.toLowerCase().includes("pin")) {
        setPinError(msg);
        setPin("");
        client
          .get("/payments/pin/status")
          .then((r) => setPinStatus(r.data.data))
          .catch(() => {});
      } else if (err.response?.status === 429) {
        setPinError(msg);
        setPinStatus((p) => ({ ...p, isLocked: true }));
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const withdrawableCurrencies = Object.entries(currencyBalances).filter(
    ([, b]) => b > 0,
  );
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }}
          onPress={onClose}
        >
          <Pressable
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: modalBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "96%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.border,
                alignSelf: "center",
                marginTop: 12,
                marginBottom: 4,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              <AppText
                weight="displayBlack"
                style={{ fontSize: 18, color: c.text }}
              >
                {t("workerWithdrawals.modal.title")}
              </AppText>
              <Pressable
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={16} color={c.text} />
              </Pressable>
            </View>

            {pinLoading && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 24,
                }}
              >
                <ActivityIndicator size="small" color={c.orange} />
                <AppText style={{ color: c.textMuted, fontSize: 13 }}>
                  {t("workerWithdrawals.pin.status.checking")}
                </AppText>
              </View>
            )}

            {!pinLoading && showPinSetup && (
              <ScrollView>
                <PinSetupScreen
                  c={c}
                  onDone={() => {
                    setShowPinSetup(false);
                    setPinStatus((p) => ({ ...p, pinSet: true }));
                  }}
                />
              </ScrollView>
            )}

            {!pinLoading && !showPinSetup && pinStatus?.isLocked && (
              <View style={{ alignItems: "center", padding: 40, gap: 12 }}>
                <Ionicons name="lock-closed" size={52} color="#ef4444" />
                <AppText
                  weight="displayBlack"
                  style={{ fontSize: 18, color: "#ef4444" }}
                >
                  {t("workerWithdrawals.pin.status.locked")}
                </AppText>
                <AppText
                  style={{
                    color: c.textMuted,
                    textAlign: "center",
                    lineHeight: 20,
                    fontSize: 13,
                  }}
                >
                  {t("workerWithdrawals.pin.status.lockedMessage")}
                </AppText>
                <Pressable
                  onPress={onClose}
                  style={{
                    marginTop: 8,
                    backgroundColor: c.bgCard,
                    borderRadius: 10,
                    paddingHorizontal: 24,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  <AppText style={{ color: c.textMuted, fontSize: 13 }}>
                    {t("workerWithdrawals.modal.close")}
                  </AppText>
                </Pressable>
              </View>
            )}

            {!pinLoading && !showPinSetup && !pinStatus?.isLocked && success ? (
              <View style={{ alignItems: "center", padding: 48, gap: 12 }}>
                <Ionicons name="checkmark-circle" size={52} color="#22c55e" />
                <AppText
                  weight="displayBlack"
                  style={{ fontSize: 18, color: c.text }}
                >
                  {t("workerWithdrawals.modal.success")}
                </AppText>
                <AppText
                  style={{
                    color: c.textMuted,
                    textAlign: "center",
                    lineHeight: 20,
                    fontSize: 13,
                  }}
                >
                  {success}
                </AppText>
                <Pressable
                  onPress={onClose}
                  style={{
                    backgroundColor: c.orange,
                    borderRadius: 12,
                    paddingHorizontal: 28,
                    paddingVertical: 12,
                    marginTop: 8,
                  }}
                >
                  <AppText
                    weight="semibold"
                    style={{ color: "#fff", fontSize: 14 }}
                  >
                    {t("workerWithdrawals.modal.done")}
                  </AppText>
                </Pressable>
              </View>
            ) : null}

            {!pinLoading &&
              !showPinSetup &&
              !pinStatus?.isLocked &&
              !success && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ padding: 16, gap: 16 }}
                >
                  <SectionLabel
                    label={t("workerWithdrawals.modal.wallet")}
                    c={c}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 4 }}
                  >
                    {withdrawableCurrencies.map(([cur, bal]) => {
                      const cm = CURRENCY_META[cur] ?? {
                        symbol: cur,
                        name: cur,
                      };
                      const sel = currency === cur;
                      return (
                        <Pressable
                          key={cur}
                          onPress={() => setCurrency(cur)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            padding: 10,
                            marginRight: 8,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: sel ? c.orange : c.border,
                            backgroundColor: sel
                              ? "rgba(249,115,22,0.1)"
                              : c.bgPanel,
                          }}
                        >
                          <AppText
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: sel ? c.orange : c.text,
                            }}
                          >
                            {cm.symbol}
                          </AppText>
                          <View>
                            <AppText
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: sel ? c.orange : c.text,
                              }}
                            >
                              {cur}
                            </AppText>
                            <AppText
                              style={{ fontSize: 10, color: c.textMuted }}
                            >
                              {fmt(bal, cur)}
                            </AppText>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: c.bgCard,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 20,
                          fontWeight: "700",
                          color: c.orange,
                        }}
                      >
                        {currMeta.symbol}
                      </AppText>
                      <View>
                        <AppText
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: c.text,
                          }}
                        >
                          {currMeta.name} Wallet
                        </AppText>
                        <AppText style={{ fontSize: 10, color: c.textMuted }}>
                          {currency}
                        </AppText>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <AppText
                        style={{
                          fontSize: 9,
                          color: c.textMuted,
                          fontWeight: "700",
                        }}
                      >
                        {t(
                          "workerWithdrawals.main.totalAvailable",
                        ).toUpperCase()}
                      </AppText>
                      <AppText
                        weight="displayBlack"
                        style={{ fontSize: 16, color: c.orange }}
                      >
                        {fmt(availableForCurrency, currency)}
                      </AppText>
                    </View>
                  </View>

                  <SectionLabel
                    label={t("workerWithdrawals.modal.method")}
                    c={c}
                  />
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {methods.map((m) => {
                      const sel = selMethod?.key === m.key;
                      return (
                        <Pressable
                          key={m.key}
                          onPress={() => {
                            setSelMethod(m);
                            setForm({});
                            setVerifiedName(null);
                          }}
                          style={{
                            width: (SCREEN_W - 32 - 16) / 2 - 4,
                            padding: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: sel ? c.orange : c.border,
                            backgroundColor: sel
                              ? "rgba(249,115,22,0.1)"
                              : c.bgPanel,
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons
                            name={m.icon}
                            size={20}
                            color={sel ? c.orange : c.textMuted}
                          />
                          <AppText
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: sel ? c.orange : c.text,
                              textAlign: "center",
                            }}
                          >
                            {m.label}
                          </AppText>
                          <AppText
                            style={{
                              fontSize: 9,
                              color: c.textMuted,
                              textAlign: "center",
                            }}
                          >
                            {m.desc}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>

                  {selMethod && (
                    <>
                      <SectionLabel
                        label={t("workerWithdrawals.modal.details")}
                        c={c}
                      />
                      {selMethod.method === "bank_transfer" &&
                        !selMethod.isInternational && (
                          <View style={{ gap: 12 }}>
                            <View>
                              <AppText
                                style={{
                                  fontSize: 11,
                                  color: c.textMuted,
                                  fontWeight: "600",
                                  marginBottom: 6,
                                }}
                              >
                                {t("workerWithdrawals.field.bank")}
                              </AppText>
                              <Pressable
                                onPress={() => setShowBankPick(true)}
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: 10,
                                  borderRadius: 10,
                                  borderWidth: 1,
                                  borderColor: c.border,
                                  backgroundColor: c.bgInput,
                                }}
                              >
                                <AppText
                                  style={{
                                    color: form.bankName ? c.text : c.textMuted,
                                    fontSize: 13,
                                  }}
                                >
                                  {form.bankName ??
                                    (banksLoading
                                      ? t(
                                          "workerWithdrawals.modal.loadingBanks",
                                        )
                                      : t(
                                          "workerWithdrawals.modal.selectBank",
                                        ))}
                                </AppText>
                                <Ionicons
                                  name="chevron-down"
                                  size={16}
                                  color={c.textMuted}
                                />
                              </Pressable>
                              <BankPickerModal
                                visible={showBankPick}
                                banks={banks}
                                value={form.bankCode}
                                onSelect={(b) => {
                                  setF("bankCode", b.code);
                                  setF("bankName", b.name);
                                }}
                                onClose={() => setShowBankPick(false)}
                                c={c}
                                modalBg={modalBg}
                              />
                            </View>
                            <FormField
                              label={t("workerWithdrawals.field.accountNumber")}
                              placeholder={t(
                                "workerWithdrawals.field.accountNumberPlaceholder",
                              )}
                              value={form.accountNumber ?? ""}
                              onChange={(v) => setF("accountNumber", v)}
                              keyboard="number-pad"
                              c={c}
                            />
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                {verifiedName ? (
                                  <View
                                    style={{
                                      padding: 8,
                                      borderRadius: 8,
                                      backgroundColor: "rgba(34,197,94,0.1)",
                                      borderWidth: 1,
                                      borderColor: "rgba(34,197,94,0.2)",
                                    }}
                                  >
                                    <AppText
                                      style={{
                                        fontSize: 12,
                                        color: "#22c55e",
                                        fontWeight: "700",
                                      }}
                                    >
                                      {verifiedName}
                                    </AppText>
                                  </View>
                                ) : verifyErr ? (
                                  <View
                                    style={{
                                      padding: 8,
                                      borderRadius: 8,
                                      backgroundColor: "rgba(239,68,68,0.1)",
                                      borderWidth: 1,
                                      borderColor: "rgba(239,68,68,0.2)",
                                    }}
                                  >
                                    <AppText
                                      style={{ fontSize: 11, color: "#ef4444" }}
                                    >
                                      {verifyErr}
                                    </AppText>
                                  </View>
                                ) : (
                                  <AppText
                                    style={{ fontSize: 11, color: c.textMuted }}
                                  >
                                    {t("workerWithdrawals.modal.verifyAccount")}
                                  </AppText>
                                )}
                              </View>
                              <Pressable
                                onPress={verifyAccount}
                                disabled={
                                  verifying ||
                                  !form.accountNumber ||
                                  !form.bankCode
                                }
                                style={{
                                  paddingHorizontal: 14,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: c.border,
                                  backgroundColor: c.bgCard,
                                  opacity:
                                    !form.accountNumber || !form.bankCode
                                      ? 0.4
                                      : 1,
                                }}
                              >
                                {verifying ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={c.orange}
                                  />
                                ) : (
                                  <AppText
                                    style={{
                                      color: c.text,
                                      fontWeight: "600",
                                      fontSize: 12,
                                    }}
                                  >
                                    {t("workerWithdrawals.modal.verify")}
                                  </AppText>
                                )}
                              </Pressable>
                            </View>
                          </View>
                        )}

                      {selMethod.method === "bank_transfer" &&
                        selMethod.isInternational && (
                          <View style={{ gap: 12 }}>
                            {[
                              {
                                key: "bankName",
                                label: t("workerWithdrawals.field.bankName"),
                                placeholder: t(
                                  "workerWithdrawals.field.bankNamePlaceholder",
                                ),
                              },
                              {
                                key: "accountNumber",
                                label: t("workerWithdrawals.field.iban"),
                                placeholder: t(
                                  "workerWithdrawals.field.ibanPlaceholder",
                                ),
                              },
                              {
                                key: "swiftBic",
                                label: t("workerWithdrawals.field.swift"),
                                placeholder: t(
                                  "workerWithdrawals.field.swiftPlaceholder",
                                ),
                              },
                              {
                                key: "routingNumber",
                                label: t("workerWithdrawals.field.routing"),
                                placeholder: t(
                                  "workerWithdrawals.field.routingPlaceholder",
                                ),
                              },
                              {
                                key: "accountName",
                                label: t(
                                  "workerWithdrawals.field.accountHolder",
                                ),
                                placeholder: t(
                                  "workerWithdrawals.field.accountHolderPlaceholder",
                                ),
                              },
                              {
                                key: "bankCountry",
                                label: t("workerWithdrawals.field.bankCountry"),
                                placeholder: t(
                                  "workerWithdrawals.field.bankCountryPlaceholder",
                                ),
                              },
                            ].map(({ key, label, placeholder }) => (
                              <FormField
                                key={key}
                                label={label}
                                placeholder={placeholder}
                                value={form[key] ?? ""}
                                onChange={(v) => setF(key, v)}
                                c={c}
                              />
                            ))}
                          </View>
                        )}

                      {selMethod.method === "mobile_money" && (
                        <View style={{ gap: 12 }}>
                          <FormField
                            label={t("workerWithdrawals.field.mobileNumber")}
                            placeholder={t(
                              "workerWithdrawals.field.mobileNumberPlaceholder",
                            )}
                            value={form.mobileNumber ?? ""}
                            onChange={(v) => setF("mobileNumber", v)}
                            keyboard="phone-pad"
                            c={c}
                          />
                          <FormField
                            label={t("workerWithdrawals.field.mobileName")}
                            placeholder={t(
                              "workerWithdrawals.field.mobileNamePlaceholder",
                            )}
                            value={form.mobileName ?? ""}
                            onChange={(v) => setF("mobileName", v)}
                            c={c}
                          />
                          {selMethod.provider && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                padding: 10,
                                borderRadius: 8,
                                backgroundColor: "rgba(249,115,22,0.1)",
                                borderWidth: 1,
                                borderColor: "rgba(249,115,22,0.2)",
                              }}
                            >
                              <Ionicons
                                name="phone-portrait-outline"
                                size={16}
                                color={c.orange}
                              />
                              <AppText
                                style={{ fontSize: 13, color: c.orange }}
                              >
                                {t("workerWithdrawals.modal.provider", {
                                  provider: selMethod.provider,
                                })}
                              </AppText>
                            </View>
                          )}
                        </View>
                      )}

                      {selMethod.method === "crypto" && (
                        <View style={{ gap: 14 }}>
                          <View>
                            <AppText
                              style={{
                                fontSize: 12,
                                color: c.textMuted,
                                fontWeight: "600",
                                marginBottom: 8,
                              }}
                            >
                              {t("workerWithdrawals.field.token")}
                            </AppText>
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              {CRYPTO_TOKENS.map((token) => {
                                const sel = form.cryptoToken === token;
                                return (
                                  <Pressable
                                    key={token}
                                    onPress={() => setF("cryptoToken", token)}
                                    style={{
                                      paddingHorizontal: 16,
                                      paddingVertical: 8,
                                      borderRadius: 8,
                                      borderWidth: 1,
                                      borderColor: sel ? c.orange : c.border,
                                      backgroundColor: sel
                                        ? "rgba(249,115,22,0.1)"
                                        : c.bgCard,
                                    }}
                                  >
                                    <AppText
                                      style={{
                                        color: sel ? c.orange : c.text,
                                        fontWeight: "700",
                                        fontSize: 12,
                                      }}
                                    >
                                      {token}
                                    </AppText>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                          <View>
                            <AppText
                              style={{
                                fontSize: 12,
                                color: c.textMuted,
                                fontWeight: "600",
                                marginBottom: 8,
                              }}
                            >
                              {t("workerWithdrawals.field.network")}
                            </AppText>
                            <View style={{ gap: 6 }}>
                              {CRYPTO_NETWORKS.map((n) => {
                                const sel = form.cryptoNetwork === n.value;
                                return (
                                  <Pressable
                                    key={n.value}
                                    onPress={() =>
                                      setF("cryptoNetwork", n.value)
                                    }
                                    style={{
                                      padding: 12,
                                      borderRadius: 10,
                                      borderWidth: 1,
                                      borderColor: sel ? c.orange : c.border,
                                      backgroundColor: sel
                                        ? "rgba(249,115,22,0.1)"
                                        : c.bgCard,
                                    }}
                                  >
                                    <AppText
                                      style={{
                                        color: sel ? c.orange : c.text,
                                        fontWeight: sel ? "700" : "400",
                                        fontSize: 13,
                                      }}
                                    >
                                      {n.label}
                                    </AppText>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                          <FormField
                            label={t("workerWithdrawals.field.walletAddress")}
                            placeholder={t(
                              "workerWithdrawals.field.walletAddressPlaceholder",
                            )}
                            value={form.cryptoAddress ?? ""}
                            onChange={(v) => setF("cryptoAddress", v)}
                            mono
                            c={c}
                          />
                          <View
                            style={{
                              flexDirection: "row",
                              gap: 10,
                              padding: 12,
                              borderRadius: 10,
                              backgroundColor: "rgba(234,179,8,0.08)",
                              borderWidth: 1,
                              borderColor: "rgba(234,179,8,0.2)",
                            }}
                          >
                            <Ionicons
                              name="warning-outline"
                              size={16}
                              color="#eab308"
                            />
                            <AppText
                              style={{
                                flex: 1,
                                fontSize: 12,
                                color: "#eab308",
                                lineHeight: 18,
                              }}
                            >
                              {t("workerWithdrawals.field.cryptoWarning")}
                            </AppText>
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  <SectionLabel
                    label={t("workerWithdrawals.modal.amount", { currency })}
                    c={c}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      overflow: "hidden",
                      backgroundColor: c.bgInput,
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 12,
                        height: 48,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: c.bgCard,
                        borderRightWidth: 1,
                        borderRightColor: c.border,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: c.textMuted,
                        }}
                      >
                        {currMeta.symbol}
                      </AppText>
                    </View>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      placeholderTextColor={c.textMuted}
                      keyboardType="decimal-pad"
                      style={{
                        flex: 1,
                        color: c.text,
                        fontSize: 18,
                        fontWeight: "700",
                        paddingHorizontal: 12,
                      }}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[0.25, 0.5, 0.75, 1].map((f) => (
                      <Pressable
                        key={f}
                        onPress={() =>
                          setAmount((availableForCurrency * f).toFixed(2))
                        }
                        style={{
                          flex: 1,
                          padding: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: c.border,
                          backgroundColor: c.bgCard,
                          alignItems: "center",
                        }}
                      >
                        <AppText
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: c.text,
                          }}
                        >
                          {f === 1 ? "Max" : `${f * 100}%`}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>

                  {amount && parseFloat(amount) > 0 && (
                    <View
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: c.bgCard,
                        borderWidth: 1,
                        borderColor: c.border,
                      }}
                    >
                      <AppText style={{ fontSize: 12, color: c.textMuted }}>
                        You receive{" "}
                        <AppText
                          style={{ color: "#22c55e", fontWeight: "700" }}
                        >
                          {fmt(parseFloat(amount), currency)} — no fee
                        </AppText>
                      </AppText>
                    </View>
                  )}

                  <View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <SectionLabel
                        label={t("workerWithdrawals.modal.pin")}
                        c={c}
                        noMargin
                      />
                      {pinStatus && !pinStatus.isLocked && (
                        <AppText style={{ fontSize: 10, color: c.textMuted }}>
                          {t("workerWithdrawals.pin.status.attemptsPlural", {
                            count: pinStatus.attemptsRemaining,
                          })}
                        </AppText>
                      )}
                    </View>
                    <PinInput
                      value={pin}
                      onChange={(v) => {
                        setPin(v);
                        if (pinError) setPinError("");
                      }}
                      disabled={submitting}
                      error={pinError}
                      c={c}
                    />
                    <Pressable
                      onPress={() => setShowPinSetup(true)}
                      style={{ marginTop: 8 }}
                    >
                      <AppText
                        style={{
                          fontSize: 12,
                          color: c.orange,
                          textDecorationLine: "underline",
                        }}
                      >
                        {t("workerWithdrawals.pin.status.forgot")}
                      </AppText>
                    </Pressable>
                  </View>

                  {error ? (
                    <View
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: "rgba(239,68,68,0.1)",
                        borderWidth: 1,
                        borderColor: "rgba(239,68,68,0.3)",
                      }}
                    >
                      <AppText style={{ fontSize: 12, color: "#ef4444" }}>
                        {error}
                      </AppText>
                    </View>
                  ) : null}

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: c.bgCard,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color={c.textMuted}
                    />
                    <AppText
                      style={{
                        flex: 1,
                        fontSize: 11,
                        color: c.textMuted,
                        lineHeight: 16,
                      }}
                    >
                      {t("workerWithdrawals.modal.info")}
                    </AppText>
                  </View>

                  <Pressable
                    onPress={handleSubmit}
                    disabled={
                      submitting || !amount || !selMethod || pin.length < 4
                    }
                    style={[
                      {
                        width: "100%",
                        padding: 14,
                        borderRadius: 14,
                        alignItems: "center",
                        backgroundColor: c.orange,
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 8,
                      },
                      (submitting ||
                        !amount ||
                        !selMethod ||
                        pin.length < 4) && { opacity: 0.5 },
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <AppText
                        weight="displayBlack"
                        style={{ color: "#fff", fontSize: 15 }}
                      >
                        {t("workerWithdrawals.modal.submit", {
                          amount: amount
                            ? fmt(parseFloat(amount) || 0, currency)
                            : "",
                        })}
                      </AppText>
                    )}
                  </Pressable>
                  <View style={{ height: 32 }} />
                </ScrollView>
              )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function SectionLabel({ label, c, noMargin }) {
  return (
    <AppText
      style={{
        fontSize: 10,
        color: c.textMuted,
        letterSpacing: 0.8,
        fontWeight: "700",
        textTransform: "uppercase",
        marginBottom: noMargin ? 0 : 0,
      }}
    >
      {label}
    </AppText>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  keyboard = "default",
  mono,
  c,
}) {
  return (
    <View>
      <AppText
        style={{
          fontSize: 11,
          color: c.textMuted,
          fontWeight: "600",
          marginBottom: 6,
        }}
      >
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboard}
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 10,
          padding: 10,
          color: c.text,
          fontSize: 13,
          backgroundColor: c.bgInput,
          fontFamily: mono && Platform.OS === "ios" ? "Courier" : undefined,
        }}
      />
    </View>
  );
}

function StatCard({ label, value, sub, orange, c }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: orange ? "rgba(249,115,22,0.3)" : c.border,
        backgroundColor: orange ? "rgba(249,115,22,0.1)" : c.bgPanel,
      }}
    >
      <AppText
        style={{
          fontSize: 9,
          color: orange ? "rgba(249,115,22,0.6)" : c.textMuted,
          letterSpacing: 0.8,
          fontWeight: "700",
        }}
      >
        {label}
      </AppText>
      <AppText
        weight="displayBlack"
        style={{
          fontSize: 16,
          color: orange ? c.orange : c.text,
          marginTop: 4,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </AppText>
      <AppText style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>
        {sub}
      </AppText>
    </View>
  );
}

function WithdrawalCard({ w, onReceipt, c }) {
  const { t } = useTranslation();
  const STATUS_META = getStatusMeta(t);
  const sm = STATUS_META[w.status] ?? STATUS_META.PENDING;
  const cur = w.currency ?? "NGN";
  const cm = CURRENCY_META[cur] ?? { symbol: cur };

  return (
    <View
      style={{
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 6,
        }}
      >
        <View>
          <AppText style={{ fontSize: 11, fontWeight: "700", color: c.text }}>
            #
            {String(w.reference ?? w.id ?? "")
              .slice(-8)
              .toUpperCase()}
          </AppText>
          <AppText style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>
            {timeAgo(w.createdAt, t)}
          </AppText>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
            backgroundColor: sm.bg,
            borderWidth: 1,
            borderColor: sm.color + "55",
          }}
        >
          <AppText style={{ fontSize: 10, color: sm.color, fontWeight: "700" }}>
            {sm.label}
          </AppText>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <Ionicons name="card-outline" size={14} color={c.textMuted} />
        <AppText style={{ color: c.text, fontSize: 13 }}>
          {w.method?.replace(/_/g, " ")}
        </AppText>
      </View>
      <AppText
        weight="displayBlack"
        style={{
          color: c.text,
          fontSize: 18,
          letterSpacing: -0.5,
          marginBottom: 10,
        }}
      >
        {fmt(w.amount, cur)}
      </AppText>
      <Pressable
        onPress={() => onReceipt(w)}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <AppText style={{ fontSize: 11, fontWeight: "600", color: c.text }}>
          {t("workerWithdrawals.card.receipt")}
        </AppText>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerWithdrawalsScreen() {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const c = th.colors;
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";

  const [balance, setBalance] = useState(null);
  const [balancesByCurrency, setBalancesByCurrency] = useState({});
  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [activeCurrency, setActiveCurrency] = useState("ALL");
  const [receipt, setReceipt] = useState(null);
  const [allHistory, setAllHistory] = useState([]);

  // Track which currency should be selected when opening the payout modal
  const [payoutDefaultCurrency, setPayoutDefaultCurrency] = useState("NGN");

  const load = useCallback(async () => {
    try {
      const wdRes = await client.get("/payments/withdrawals", {
        params: { limit: 50 },
      });
      const d = wdRes.data.data;
      setBalance(d.balance ?? {});
      setWithdrawals(d.withdrawals ?? []);
      setTotal(d.total ?? 0);
      setBalancesByCurrency(d.balancesByCurrency ?? {});

      let wide = d.withdrawals ?? [];
      try {
        const wideRes = await client.get(
          "/payments/withdrawals?page=1&limit=100",
        );
        wide = wideRes.data.data?.withdrawals ?? wide;
      } catch {}
      setAllHistory(wide);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? t("workerWithdrawals.main.loadFailed"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currenciesWithBalance = Object.entries(balancesByCurrency).sort(
    ([, a], [, b]) =>
      (b.available || 0) +
      (b.inEscrow || 0) -
      ((a.available || 0) + (a.inEscrow || 0)),
  );

  const isFiltered = activeCurrency !== "ALL";
  const activeMeta = isFiltered
    ? (CURRENCY_META[activeCurrency] ?? { symbol: activeCurrency })
    : null;
  const activeBalance = isFiltered
    ? (balancesByCurrency[activeCurrency] ?? null)
    : null;

  const visibleHistory = isFiltered
    ? withdrawals.filter((w) => w.currency === activeCurrency)
    : withdrawals;

  const totalAvailable = isFiltered
    ? (activeBalance?.available ?? 0)
    : (balance?.available ?? 0);
  const totalInEscrow = isFiltered
    ? (activeBalance?.inEscrow ?? 0)
    : (balance?.inEscrow ?? 0);

  const totalPendingPayout = isFiltered
    ? allHistory
        .filter(
          (w) =>
            w.currency === activeCurrency &&
            ["PENDING", "PROCESSING"].includes(w.status),
        )
        .reduce((sum, w) => sum + (w.amount || 0), 0)
    : (balance?.pendingPayout ?? 0);

  const pendingCount = isFiltered
    ? allHistory.filter(
        (w) =>
          w.currency === activeCurrency &&
          ["PENDING", "PROCESSING"].includes(w.status),
      ).length
    : allHistory.filter((w) => ["PENDING", "PROCESSING"].includes(w.status))
        .length;

  const openPayout = (currency = null) => {
    if (currency) {
      setPayoutDefaultCurrency(currency);
    } else if (isFiltered) {
      setPayoutDefaultCurrency(activeCurrency);
    } else {
      setPayoutDefaultCurrency(currenciesWithBalance[0]?.[0] ?? "NGN");
    }
    setShowPayout(true);
  };

  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Skeleton width="60%" height={32} radius={8} />
        <Skeleton width="40%" height={16} radius={8} />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Skeleton width={120} height={80} radius={14} />
          <Skeleton width={120} height={80} radius={14} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Skeleton width="48%" height={80} radius={14} />
          <Skeleton width="48%" height={80} radius={14} />
        </View>
        <Skeleton
          width="100%"
          height={200}
          radius={14}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
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
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 20,
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              fontSize: 10,
              color: c.orange,
              fontWeight: "700",
              letterSpacing: 0.8,
            }}
          >
            {isFiltered
              ? `${activeCurrency} Wallet`
              : t("workerWithdrawals.main.earningsPayouts")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 26,
              color: c.text,
              marginVertical: 4,
              letterSpacing: -0.5,
            }}
          >
            {isFiltered ? (activeMeta?.name ?? activeCurrency) : "Your Wallet"}
          </AppText>
          <AppText style={{ color: c.textMuted, fontSize: 12 }}>
            {isFiltered
              ? `Showing only ${activeCurrency} — click "All" to see combined`
              : t("workerWithdrawals.main.subtitle")}
          </AppText>
        </View>
        <Pressable
          onPress={() => openPayout()}
          disabled={currenciesWithBalance.length === 0}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: c.orange,
            opacity: currenciesWithBalance.length === 0 ? 0.4 : 1,
          }}
        >
          <Ionicons name="arrow-up" size={14} color="#fff" />
          <AppText weight="semibold" style={{ color: "#fff", fontSize: 12 }}>
            {t("workerWithdrawals.main.withdraw")}
          </AppText>
        </Pressable>
      </View>

      {/* Wallet Cards */}
      {currenciesWithBalance.length > 0 && (
        <>
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              letterSpacing: 0.8,
              fontWeight: "700",
              marginBottom: 10,
            }}
          >
            {t("workerWithdrawals.main.wallets")}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            <Pressable
              onPress={() => setActiveCurrency("ALL")}
              style={{
                width: 120,
                marginRight: 10,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: activeCurrency === "ALL" ? c.orange : c.border,
                backgroundColor:
                  activeCurrency === "ALL" ? "rgba(249,115,22,0.1)" : c.bgPanel,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name="wallet-outline"
                  size={20}
                  color={activeCurrency === "ALL" ? c.orange : c.textMuted}
                />
                <AppText
                  style={{
                    fontSize: 10,
                    color: activeCurrency === "ALL" ? c.orange : c.textMuted,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                  }}
                >
                  ALL
                </AppText>
              </View>
              <AppText
                weight="displayBlack"
                style={{
                  fontSize: 16,
                  color: activeCurrency === "ALL" ? c.orange : c.text,
                  letterSpacing: -0.5,
                }}
              >
                {currenciesWithBalance.length} Wallets
              </AppText>
              <AppText
                style={{ fontSize: 9, color: c.textMuted, marginTop: 2 }}
              >
                Combined view
              </AppText>
            </Pressable>

            {currenciesWithBalance.map(([cur, info]) => {
              const cm = CURRENCY_META[cur] ?? { symbol: cur, name: cur };
              const sel = activeCurrency === cur;
              const hasAvailable = (info.available ?? 0) > 0;
              const hasEscrow = (info.inEscrow ?? 0) > 0;
              const hasPending = (info.pendingPayout ?? 0) > 0;

              return (
                <Pressable
                  key={cur}
                  onPress={() => setActiveCurrency(cur)}
                  style={{
                    width: 130,
                    marginRight: 10,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: sel ? c.orange : c.border,
                    backgroundColor: sel ? "rgba(249,115,22,0.1)" : c.bgPanel,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: sel ? c.orange : c.text,
                      }}
                    >
                      {cm.symbol}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 10,
                        color: sel ? c.orange : c.textMuted,
                        fontWeight: "700",
                        letterSpacing: 0.6,
                      }}
                    >
                      {cur}
                    </AppText>
                  </View>
                  <AppText
                    weight="displayBlack"
                    style={{
                      fontSize: 16,
                      color: sel ? c.orange : c.text,
                      letterSpacing: -0.5,
                    }}
                  >
                    {fmt(info.available ?? 0, cur)}
                  </AppText>
                  <AppText
                    style={{ fontSize: 9, color: c.textMuted, marginTop: 2 }}
                  >
                    {hasEscrow
                      ? `${fmt(info.inEscrow, cur)} awaiting release`
                      : `Available in ${cur}`}
                  </AppText>
                  {(hasPending ||
                    (info.totalEarned ?? 0) > (info.available ?? 0)) && (
                    <AppText
                      style={{
                        fontSize: 9,
                        color: c.orange,
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      {hasPending
                        ? `${fmt(info.pendingPayout, cur)} pending`
                        : "incl. partial releases"}
                    </AppText>
                  )}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setActiveCurrency(cur);
                      openPayout(cur);
                    }}
                    disabled={!hasAvailable}
                    style={{
                      marginTop: 8,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: c.border,
                      alignItems: "center",
                      opacity: hasAvailable ? 1 : 0.4,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: c.textDim,
                      }}
                    >
                      {hasAvailable
                        ? t("workerWithdrawals.main.withdraw")
                        : "No funds yet"}
                    </AppText>
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Summary Stats */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <StatCard
          label={t("workerWithdrawals.main.totalAvailable")}
          value={fmt(totalAvailable, isFiltered ? activeCurrency : "USD")}
          sub={
            isFiltered
              ? `${activeCurrency} available`
              : t("workerWithdrawals.main.acrossCurrencies")
          }
          orange
          c={c}
        />
        <StatCard
          label={t("workerWithdrawals.main.inEscrow")}
          value={fmt(totalInEscrow, isFiltered ? activeCurrency : "USD")}
          sub={t("workerWithdrawals.main.awaitingCompletion")}
          c={c}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <StatCard
          label={t("workerWithdrawals.main.pendingPayouts")}
          value={fmt(totalPendingPayout, isFiltered ? activeCurrency : "USD")}
          sub={t("workerWithdrawals.main.requestPlural", {
            count: pendingCount,
          })}
          c={c}
        />
        <StatCard
          label={t("workerWithdrawals.main.activeWallets")}
          value={String(currenciesWithBalance.length)}
          sub={t("workerWithdrawals.main.currencies")}
          c={c}
        />
      </View>

      {/* History */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.border,
          padding: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
          }}
        >
          <AppText
            weight="displayBlack"
            style={{ fontSize: 15, color: c.text }}
          >
            {t("workerWithdrawals.main.history")}{" "}
            {isFiltered ? `· ${activeCurrency}` : ""}
          </AppText>
          <AppText style={{ fontSize: 11, color: c.textMuted }}>
            {visibleHistory.length} {t("workerWithdrawals.main.records")}
          </AppText>
        </View>

        {visibleHistory.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <Ionicons
              name="cash-outline"
              size={36}
              color={c.textMuted}
              style={{ opacity: 0.5, marginBottom: 12 }}
            />
            <AppText
              weight="semibold"
              style={{ color: c.text, marginBottom: 4, fontSize: 14 }}
            >
              {t("workerWithdrawals.main.noWithdrawals")}
            </AppText>
            <AppText
              style={{ color: c.textMuted, textAlign: "center", fontSize: 12 }}
            >
              {t("workerWithdrawals.main.noWithdrawalsSub")}
            </AppText>
          </View>
        ) : (
          visibleHistory.map((w) => (
            <WithdrawalCard key={w.id} w={w} onReceipt={setReceipt} c={c} />
          ))
        )}
      </View>

      <WithdrawalModal
        visible={showPayout}
        onClose={() => setShowPayout(false)}
        balance={balance}
        currencyBalances={Object.fromEntries(
          Object.entries(balancesByCurrency).map(([cur, info]) => [
            cur,
            info.available ?? 0,
          ]),
        )}
        defaultCurrency={payoutDefaultCurrency}
        onSuccess={() => {
          setShowPayout(false);
          load();
          toast.success(t("workerWithdrawals.main.withdrawSuccess"));
        }}
        c={c}
        modalBg={modalBg}
      />
      <ReceiptModal
        withdrawal={receipt}
        onClose={() => setReceipt(null)}
        c={c}
        modalBg={modalBg}
      />
    </ScrollView>
  );
}
