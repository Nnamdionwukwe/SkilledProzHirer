// src/screens/main/WalletScreen.js
//
// Port of pages/hirer/HirerWallet.jsx + HirerWallet.module.css.
//
// Preserved verbatim:
//   - Dual source fetch (GET /wallet/balances → fallback GET /wallet/balance)
//   - Currency tabs with Empty badges
//   - Balance card with Copy + quick actions
//   - 4 stat cards (Deposits / Spent / Withdrawn / Transactions)
//   - Transaction list with search + type/status filters
//   - Pagination
//   - Deposit flow: POST /wallet/fund → Linking.openURL(paymentLink)
//     → poll /wallet/balance every 5s for 5min → cross-check /wallet/verify
//   - Withdraw flow: NGN bank / mobile money / crypto / intl wire
//   - Confirm modal with 4-digit PIN
//   - Fee model: 1% NGN capped at ₦100, 2% foreign
//   - Bank list fallback (NIGERIAN_BANKS) when GET /payments/banks fails
//   - Account name verification via POST /payments/verify-account
//
// Adaptations for React Native:
//   - navigator.clipboard → expo-clipboard (Clipboard.setStringAsync)
//   - window.open(paymentLink) → expo-linking (Linking.openURL)
//   - sessionStorage → AsyncStorage (pendingDepositReference)
//   - <select> elements → RN Modal pickers
//   - window.location.search ?ref= → dropped; deep-link handler should
//     call POST /wallet/verify/:ref externally

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import {
  FaWallet,
  FaArrowDown,
  FaArrowUp,
  FaCreditCard,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaPlus,
  FaMinus,
  FaSearch,
  FaArrowRight,
  FaArrowLeft,
  FaTimes,
  FaCopy,
  FaExclamationTriangle,
  FaCheck,
  FaMoneyBillWave,
  FaDollarSign,
  FaShieldAlt,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaGlobe,
  FaBuilding,
  FaEnvelope,
  FaUser,
  FaInfoCircle,
  FaExternalLinkAlt,
} from "../../icons/fa";

const PENDING_REF_KEY = "@skilledproz:pendingDepositReference";

// ── Helpers (verbatim from web) ─────────────────────────────────────────
function formatCurrency(amount, currency = "NGN") {
  const numAmount =
    typeof amount === "number" ? amount : parseFloat(amount) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "NGN",
      minimumFractionDigits: 2,
    }).format(numAmount);
  } catch {
    return `${currency} ${numAmount.toFixed(2)}`;
  }
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status, c) {
  const colors = {
    PENDING: c.orange,
    PROCESSING: "#3B82F6",
    COMPLETED: c.green,
    SUCCESS: c.green,
    FAILED: c.red,
    REVERSED: c.textMuted,
    CANCELLED: c.textMuted,
    INITIATED: c.orange,
  };
  return colors[status] || c.textMuted;
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    SUCCESS: "Success",
    FAILED: "Failed",
    REVERSED: "Reversed",
    CANCELLED: "Cancelled",
    INITIATED: "Initiated",
  };
  return labels[status] || status;
}

function StatusIcon({ status, size = 11, c }) {
  const color = getStatusColor(status, c);
  if (status === "COMPLETED" || status === "SUCCESS")
    return <FaCheckCircle size={size} color={color} />;
  if (status === "PENDING" || status === "INITIATED" || status === "PROCESSING")
    return <FaSpinner size={size} color={color} />;
  if (status === "FAILED" || status === "REVERSED" || status === "CANCELLED")
    return <FaTimesCircle size={size} color={color} />;
  return <FaClock size={size} color={color} />;
}

function CurrencyIcon({ currency, size = 14, color }) {
  // Simplified icon set — mobile fa.js only ships these
  if (currency === "NGN") return <FaMoneyBillWave size={size} color={color} />;
  if (currency === "USD" || currency === "EUR" || currency === "GBP")
    return <FaDollarSign size={size} color={color} />;
  return <FaMoneyBillWave size={size} color={color} />;
}

const CURRENCY_SYMBOLS = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  GHS: "GH₵",
  KES: "KSh",
  ZAR: "R",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  BRL: "R$",
  AED: "د.إ",
  SAR: "ر.س",
  QAR: "ر.ق",
  EGP: "E£",
  TZS: "TSh",
  UGX: "USh",
  RWF: "FRw",
  XOF: "CFA",
  MAD: "DH",
  PHP: "₱",
  IDR: "Rp",
  VND: "₫",
  THB: "฿",
  BDT: "৳",
  PKR: "₨",
  MYR: "RM",
  SGD: "S$",
  HKD: "HK$",
  USDC: "USDC",
  USDT: "USDT",
  BTC: "₿",
  ETH: "Ξ",
};

function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOLS[currency] || currency;
}

// ── Fee model (verbatim) ────────────────────────────────────────────────
const NGN_WALLET_WITHDRAWAL_FEE_RATE = 0.01;
const NGN_WALLET_WITHDRAWAL_FEE_CAP = 100;
const FOREIGN_WALLET_WITHDRAWAL_FEE_RATE = 0.02;

function getWalletWithdrawalFee(amount, currency = "NGN") {
  const cur = (currency || "NGN").toUpperCase();
  const numAmount = Number(amount) || 0;
  if (numAmount <= 0) {
    return { fee: 0, netAmount: 0, feeRate: 0, feePercent: 0 };
  }

  let feeRate;
  let fee;

  if (cur === "NGN") {
    feeRate = NGN_WALLET_WITHDRAWAL_FEE_RATE;
    fee = numAmount * feeRate;
    if (NGN_WALLET_WITHDRAWAL_FEE_CAP > 0) {
      fee = Math.min(fee, NGN_WALLET_WITHDRAWAL_FEE_CAP);
    }
  } else {
    feeRate = FOREIGN_WALLET_WITHDRAWAL_FEE_RATE;
    fee = numAmount * feeRate;
  }

  fee = parseFloat(fee.toFixed(2));
  const netAmount = parseFloat((numAmount - fee).toFixed(2));
  const feePercent = Math.round(feeRate * 100);

  return { fee, netAmount, feeRate, feePercent };
}

function getTransactionLabel(type) {
  const labels = {
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    PAYMENT: "Payment",
    SUBSCRIPTION: "Subscription",
    REFUND: "Refund",
    BONUS: "Bonus",
    ADJUSTMENT: "Adjustment",
  };
  return labels[type] || type;
}

function getPaymentChannel(tx) {
  if (tx.type === "DEPOSIT") {
    const p = tx.meta?.paymentProvider;
    if (p === "FLUTTERWAVE" || p === "PAYSTACK")
      return { label: "Card / Mobile Money", Icon: FaCreditCard };
    return { label: "Card / Bank", Icon: FaCreditCard };
  }
  if (tx.type === "WITHDRAWAL")
    return { label: "Bank Transfer", Icon: FaBuilding };
  if (tx.type === "PAYMENT") {
    const p = tx.meta?.paymentProvider || "WALLET";
    if (p === "WALLET") return { label: "Wallet", Icon: FaWallet };
    if (p === "PAYSTACK")
      return { label: "Card (Paystack)", Icon: FaCreditCard };
    if (p === "FLUTTERWAVE")
      return { label: "Card (Flutterwave)", Icon: FaCreditCard };
    if (p === "BANK_TRANSFER")
      return { label: "Bank Transfer", Icon: FaBuilding };
    if (p === "CRYPTO") return { label: "Crypto", Icon: FaDollarSign };
    return { label: "Payment", Icon: FaCreditCard };
  }
  if (tx.type === "SUBSCRIPTION")
    return { label: "Subscription", Icon: FaShieldAlt };
  if (tx.type === "REFUND") return { label: "Refund", Icon: FaArrowUp };
  if (tx.type === "BONUS") return { label: "Bonus", Icon: FaPlus };
  return { label: "Adjustment", Icon: FaMinus };
}

// ── Bank list (verbatim) ────────────────────────────────────────────────
const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044", type: "commercial" },
  { name: "Ecobank Nigeria", code: "050", type: "commercial" },
  { name: "Fidelity Bank", code: "070", type: "commercial" },
  { name: "First Bank of Nigeria", code: "011", type: "commercial" },
  { name: "First City Monument Bank (FCMB)", code: "214", type: "commercial" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058", type: "commercial" },
  { name: "Stanbic IBTC Bank", code: "221", type: "commercial" },
  { name: "Sterling Bank", code: "232", type: "commercial" },
  { name: "United Bank for Africa (UBA)", code: "033", type: "commercial" },
  { name: "Union Bank of Nigeria", code: "032", type: "commercial" },
  { name: "Unity Bank", code: "215", type: "commercial" },
  { name: "Wema Bank / ALAT", code: "035", type: "commercial" },
  { name: "Zenith Bank", code: "057", type: "commercial" },
  { name: "Citibank Nigeria", code: "023", type: "commercial" },
  { name: "Kuda Bank", code: "090267", type: "digital" },
  { name: "Moniepoint MFB", code: "50515", type: "digital" },
  { name: "OPay Digital Services", code: "999992", type: "digital" },
  { name: "PalmPay", code: "100033", type: "digital" },
  { name: "Paga", code: "327", type: "digital" },
].sort((a, b) => a.name.localeCompare(b.name));

const CURRENCY_METHODS = {
  NGN: [
    {
      key: "ng_bank",
      method: "bank_transfer",
      label: "Nigerian Bank / Fintech",
      Icon: FaCreditCard,
      desc: "GTBank, Kuda, OPay, Access, Zenith, UBA, PalmPay +70 more",
      country: "NG",
      hasBankList: true,
    },
    {
      key: "ng_mtn",
      method: "mobile_money",
      label: "MTN MoMo Nigeria",
      Icon: FaUser,
      desc: "MTN mobile money",
      country: "NG",
      provider: "MTN",
    },
    {
      key: "ng_airtel",
      method: "mobile_money",
      label: "Airtel Money Nigeria",
      Icon: FaUser,
      desc: "Airtel mobile money",
      country: "NG",
      provider: "Airtel",
    },
    {
      key: "crypto",
      method: "crypto",
      label: "USDC / USDT",
      Icon: FaDollarSign,
      desc: "Stablecoin — any country",
    },
  ],
};

const INTL_METHODS = [
  {
    key: "intl_bank",
    method: "bank_transfer",
    label: "International Wire",
    Icon: FaGlobe,
    desc: "SWIFT / IBAN — 150+ countries",
    isInternational: true,
  },
  {
    key: "crypto",
    method: "crypto",
    label: "USDC / USDT",
    Icon: FaDollarSign,
    desc: "Stablecoin — any country",
  },
];

const CRYPTO_NETWORKS = [
  { value: "BSC", label: "BNB Smart Chain (BSC)" },
  { value: "ETH", label: "Ethereum (ERC-20)" },
  { value: "TRC20", label: "Tron (TRC-20)" },
  { value: "POLYGON", label: "Polygon (MATIC)" },
  { value: "SOLANA", label: "Solana (SOL)" },
];

const CRYPTO_TOKENS = ["USDC", "USDT", "BTC", "ETH"];

const BANK_TYPE_LABELS = {
  commercial: { label: "Commercial", color: "#818cf8" },
  digital: { label: "Digital/Fintech", color: "#f97316" },
  microfinance: { label: "Microfinance", color: "#22c55e" },
  merchant: { label: "Merchant", color: "#a78bfa" },
};

// ── CopyButton ─────────────────────────────────────────────────────────
function CopyButton({ text, label = "Copy", c }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(String(text ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <Pressable
      onPress={handleCopy}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingHorizontal: 8,
          paddingVertical: 3,
          backgroundColor: c.bgCard,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 6,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {copied ? (
        <FaCheck size={10} color={c.green} />
      ) : (
        <FaCopy size={10} color={c.textDim} />
      )}
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "600",
          color: copied ? c.green : c.textDim,
        }}
      >
        {copied ? "Copied!" : label}
      </AppText>
    </Pressable>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────
function WalletSkeleton({ c }) {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <Skeleton width="55%" height={32} radius={8} />
      <Skeleton width="65%" height={14} radius={6} />
      <Skeleton width="100%" height={70} radius={14} />
      <Skeleton width="100%" height={160} radius={18} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={80} radius={14} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={80} radius={14} />
        </View>
      </View>
      <Skeleton width="100%" height={260} radius={16} />
    </View>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────
function StatCard({ Icon, label, value, accent, c }) {
  const accentStyles =
    accent === "green"
      ? {
          borderColor: "rgba(34,197,94,0.2)",
          backgroundColor: "rgba(34,197,94,0.06)",
          iconColor: c.green,
          valueColor: c.green,
        }
      : accent === "orange"
        ? {
            borderColor: "rgba(249,115,22,0.25)",
            backgroundColor: "rgba(249,115,22,0.06)",
            iconColor: c.orange,
            valueColor: c.orange,
          }
        : {
            borderColor: c.border,
            backgroundColor: c.bgPanel,
            iconColor: c.textDim,
            valueColor: c.text,
          };

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        backgroundColor: accentStyles.backgroundColor,
        borderWidth: 1,
        borderColor: accentStyles.borderColor,
        borderRadius: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: c.bgCard,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {Icon ? <Icon size={14} color={accentStyles.iconColor} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{
            fontFamily: "Syne_800ExtraBold",
            fontSize: 15,
            fontWeight: "800",
            color: accentStyles.valueColor,
            letterSpacing: -0.2,
          }}
        >
          {value}
        </AppText>
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: "DMSans_500Medium",
            fontSize: 9,
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginTop: 2,
          }}
        >
          {label}
        </AppText>
      </View>
    </View>
  );
}

// ── CurrencyTab ────────────────────────────────────────────────────────
function CurrencyTab({ currency, balance, isActive, onPress, c }) {
  const symbol = getCurrencySymbol(currency);
  const safe = typeof balance === "number" ? balance : 0;
  const isZero = safe === 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={isZero}
      style={({ pressed }) => [
        {
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          paddingHorizontal: 12,
          paddingVertical: 8,
          minWidth: 92,
          backgroundColor: isActive ? c.orangeDim : c.bgCard,
          borderWidth: 2,
          borderColor: isActive ? c.orange : isZero ? c.border : c.border,
          borderStyle: isZero ? "dashed" : "solid",
          borderRadius: 10,
          opacity: isZero ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <CurrencyIcon
        currency={currency}
        size={12}
        color={isActive ? c.orange : c.textDim}
      />
      <AppText
        style={{
          fontFamily: "DMSans_600SemiBold",
          fontSize: 10,
          fontWeight: "700",
          color: isActive ? c.orange : c.text,
          letterSpacing: 0.3,
        }}
      >
        {currency}
      </AppText>
      <AppText
        style={{
          fontFamily: "DMSans_500Medium",
          fontSize: 10,
          fontWeight: "600",
          color: c.textDim,
        }}
      >
        {`${symbol}${safe.toFixed(2)}`}
      </AppText>
      {isZero ? (
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 1,
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 4,
            marginTop: 2,
          }}
        >
          <AppText
            style={{
              fontSize: 8,
              fontWeight: "600",
              color: c.textMuted,
            }}
          >
            Empty
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── TransactionRow ─────────────────────────────────────────────────────
function TransactionRow({ transaction, onPress, c, format }) {
  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountColor = isCredit ? c.green : c.red;
  const prefix = isCredit ? "+" : "-";
  const channel = getPaymentChannel(transaction);
  const ChannelIcon = channel.Icon;

  const amount =
    transaction.netAmount != null ? transaction.netAmount : transaction.amount;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "column",
          gap: 8,
          padding: 12,
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Main row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            backgroundColor: c.orangeDim,
            borderWidth: 1,
            borderColor: c.orangeGlow,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ChannelIcon size={14} color={c.orange} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <AppText
              numberOfLines={1}
              style={{
                fontFamily: "DMSans_600SemiBold",
                fontSize: 13,
                fontWeight: "700",
                color: c.text,
              }}
            >
              {getTransactionLabel(transaction.type)}
            </AppText>
            {transaction.reference ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  backgroundColor: c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 999,
                }}
              >
                <AppText
                  style={{
                    fontSize: 9,
                    color: c.textMuted,
                    fontWeight: "600",
                  }}
                >
                  {transaction.reference}
                </AppText>
              </View>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 4,
              alignItems: "center",
            }}
          >
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 13,
                fontWeight: "800",
                color: amountColor,
              }}
            >
              {`${prefix}${format(amount, transaction.currency || "NGN")}`}
            </AppText>
            <AppText
              style={{
                fontSize: 9,
                fontWeight: "700",
                color: c.textDim,
                backgroundColor: c.bgCard,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {channel.label}
            </AppText>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <FaClock size={10} color={c.textMuted} />
              <AppText style={{ fontSize: 10, color: c.textMuted }}>
                {new Date(transaction.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {/* Status footer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: c.border,
          borderStyle: "dashed",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: getStatusColor(transaction.status, c),
          }}
        >
          <StatusIcon status={transaction.status} size={10} c={c} />
          <AppText
            style={{
              fontSize: 9,
              fontWeight: "800",
              color: getStatusColor(transaction.status, c),
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {getStatusLabel(transaction.status)}
          </AppText>
        </View>
        <FaChevronRight size={11} color={c.textMuted} />
      </View>
    </Pressable>
  );
}

// ── Deposit Modal ──────────────────────────────────────────────────────
function DepositModal({ isOpen, onClose, onDeposit, loading, currencies, c }) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setCurrency(currencies[0] || "NGN");
      setIsSubmitting(false);
    }
  }, [isOpen, currencies]);

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 100) {
      Alert.alert(
        "Minimum",
        `Minimum deposit amount is ${getCurrencySymbol(currency)}100`,
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await onDeposit(num, currency);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.75)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 16,
            paddingBottom: 32,
            paddingHorizontal: 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <FaPlus size={14} color={c.orange} />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 16,
                  fontWeight: "800",
                  color: c.text,
                }}
              >
                Fund Wallet
              </AppText>
            </View>
            <Pressable onPress={onClose} hitSlop={6}>
              <FaTimes size={18} color={c.textDim} />
            </Pressable>
          </View>

          <AppText
            style={{
              fontSize: 12,
              color: c.textMuted,
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            Enter the amount you want to add to your wallet
          </AppText>

          {/* Amount input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: c.bgCard,
              borderWidth: 2,
              borderColor: c.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              marginBottom: 12,
            }}
          >
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 22,
                fontWeight: "800",
                color: c.text,
                marginRight: 8,
              }}
            >
              {getCurrencySymbol(currency)}
            </AppText>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={c.textMuted}
              style={{
                flex: 1,
                paddingVertical: 16,
                fontSize: 26,
                fontFamily: "Syne_700Bold",
                fontWeight: "700",
                color: c.text,
              }}
            />
          </View>

          {/* Currency selector */}
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: c.textDim,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              marginBottom: 6,
            }}
          >
            Currency
          </AppText>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 9,
                backgroundColor: c.bgCard,
                opacity: pressed ? 0.8 : 1,
                marginBottom: 12,
              },
            ]}
          >
            <AppText style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
              {`${currency} (${getCurrencySymbol(currency)})`}
            </AppText>
            <FaChevronDown size={12} color={c.textDim} />
          </Pressable>

          <AppText
            style={{
              fontSize: 11,
              color: c.textMuted,
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            {`Minimum: ${getCurrencySymbol(currency)}100`}
          </AppText>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
              >
                Cancel
              </AppText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={loading || isSubmitting}
              style={({ pressed }) => [
                {
                  flex: 2,
                  paddingVertical: 12,
                  backgroundColor: c.orange,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: loading || isSubmitting ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {loading || isSubmitting ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 13,
                    fontWeight: "800",
                    color: "#000",
                  }}
                >
                  Proceed to Pay
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Currency picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => setPickerOpen(false)}
        >
          <View
            style={{
              backgroundColor: c.bgPanel,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              padding: 8,
              maxHeight: 400,
            }}
          >
            <ScrollView>
              {currencies.map((cur) => (
                <Pressable
                  key={cur}
                  onPress={() => {
                    setCurrency(cur);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      backgroundColor:
                        currency === cur
                          ? c.orangeDim
                          : pressed
                            ? c.bgCard
                            : "transparent",
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: currency === cur ? c.orange : c.text,
                    }}
                  >
                    {`${cur} (${getCurrencySymbol(cur)})`}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Modal>
  );
}

// ── Withdrawal Confirm Modal ──────────────────────────────────────────
function WithdrawalConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  withdrawalData,
  c,
}) {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setPinError("");
    }
  }, [isOpen]);

  if (!isOpen || !withdrawalData) return null;

  const { amount, currency, bankName, accountNumber, accountName } =
    withdrawalData;
  const symbol = getCurrencySymbol(currency);
  const { fee, netAmount, feePercent } = getWalletWithdrawalFee(
    amount,
    currency,
  );

  const handleConfirmClick = () => {
    if (!pin || pin.length !== 4) {
      setPinError("Please enter your 4-digit withdrawal PIN");
      return;
    }
    setPinError("");
    onConfirm(pin);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.78)" }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View
              style={{
                backgroundColor: c.bgPanel,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: c.border,
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}
              >
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 16,
                    fontWeight: "800",
                    color: c.text,
                  }}
                >
                  Confirm Withdrawal
                </AppText>
                <Pressable onPress={onClose} hitSlop={6}>
                  <FaTimes size={16} color={c.textDim} />
                </Pressable>
              </View>

              <View style={{ padding: 16, gap: 14 }}>
                {/* Disclaimer */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 8,
                    backgroundColor: c.orangeDim,
                    borderWidth: 1,
                    borderColor: "rgba(249,115,22,0.2)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <FaExclamationTriangle size={16} color={c.orange} />
                  <AppText
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: c.textDim,
                      lineHeight: 17,
                    }}
                  >
                    Please{" "}
                    <AppText style={{ fontWeight: "700", color: c.text }}>
                      verify your bank details carefully
                    </AppText>{" "}
                    before confirming. Withdrawals cannot be reversed once
                    approved by our team.
                  </AppText>
                </View>

                {/* Bank details */}
                <View
                  style={{
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  <AppText style={labelStyle(c)}>BANK DETAILS</AppText>
                  <Row label="Bank" value={bankName || "—"} c={c} />
                  <Row
                    label="Account Number"
                    value={accountNumber || "—"}
                    copy
                    c={c}
                  />
                  <Row label="Account Name" value={accountName || "—"} c={c} />
                </View>

                {/* Breakdown */}
                <View
                  style={{
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  <AppText style={labelStyle(c)}>WITHDRAWAL BREAKDOWN</AppText>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <AppText style={{ fontSize: 12, color: c.textDim }}>
                      Amount
                    </AppText>
                    <AppText
                      style={{ fontSize: 13, fontWeight: "700", color: c.text }}
                    >
                      {`${symbol}${Number(amount).toFixed(2)}`}
                    </AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <AppText style={{ fontSize: 12, color: c.textDim }}>
                      {`Platform Fee (${feePercent}%)`}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: c.orange,
                      }}
                    >
                      {`-${symbol}${fee.toFixed(2)}`}
                    </AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTopWidth: 1,
                      borderTopColor: c.border,
                      paddingTop: 10,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: c.textDim,
                      }}
                    >
                      You'll Receive
                    </AppText>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <AppText
                        style={{
                          fontFamily: "Syne_800ExtraBold",
                          fontSize: 16,
                          fontWeight: "800",
                          color: c.green,
                        }}
                      >
                        {`${symbol}${netAmount.toFixed(2)}`}
                      </AppText>
                      <CopyButton
                        text={`${symbol}${netAmount.toFixed(2)}`}
                        c={c}
                      />
                    </View>
                  </View>
                </View>

                {/* PIN */}
                <View
                  style={{
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <AppText style={labelStyle(c)}>WITHDRAWAL PIN</AppText>
                  <TextInput
                    value={pin}
                    onChangeText={(t) => {
                      setPin(t.replace(/\D/g, "").slice(0, 4));
                      setPinError("");
                    }}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    placeholder="••••"
                    placeholderTextColor={c.textMuted}
                    style={{
                      backgroundColor: c.bgPanel,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 20,
                      fontWeight: "700",
                      color: c.text,
                      textAlign: "center",
                      letterSpacing: 8,
                      fontFamily: "Syne_700Bold",
                    }}
                  />
                  <AppText style={{ fontSize: 11, color: c.textMuted }}>
                    Enter the same 4-digit PIN you use for worker, referral, and
                    campaign withdrawals.
                  </AppText>
                  {pinError ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <FaExclamationTriangle size={11} color={c.red} />
                      <AppText style={{ fontSize: 11, color: c.red }}>
                        {pinError}
                      </AppText>
                    </View>
                  ) : null}
                </View>

                {/* Warning */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 6,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <FaExclamationTriangle size={13} color={c.textMuted} />
                  <AppText
                    style={{ flex: 1, fontSize: 11, color: c.textMuted }}
                  >
                    This request will be reviewed by our admin team. Processing
                    may take 24-48 hours.
                  </AppText>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={onClose}
                    disabled={loading}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        paddingVertical: 12,
                        backgroundColor: c.bgCard,
                        borderWidth: 1,
                        borderColor: c.border,
                        borderRadius: 10,
                        alignItems: "center",
                        opacity: loading ? 0.5 : pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: c.textDim,
                      }}
                    >
                      Cancel
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmClick}
                    disabled={loading}
                    style={({ pressed }) => [
                      {
                        flex: 2,
                        paddingVertical: 12,
                        backgroundColor: c.green,
                        borderRadius: 10,
                        alignItems: "center",
                        opacity: loading ? 0.5 : pressed ? 0.85 : 1,
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 6,
                      },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <FaCheck size={13} color="#fff" />
                        <AppText
                          style={{
                            fontFamily: "Syne_800ExtraBold",
                            fontSize: 13,
                            fontWeight: "800",
                            color: "#fff",
                          }}
                        >
                          Confirm Withdrawal
                        </AppText>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Row({ label, value, copy, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}
    >
      <AppText style={{ fontSize: 11, color: c.textMuted }}>{label}</AppText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexShrink: 1,
        }}
      >
        <AppText
          numberOfLines={1}
          style={{ fontSize: 12, fontWeight: "600", color: c.text }}
        >
          {value}
        </AppText>
        {copy ? <CopyButton text={String(value)} c={c} /> : null}
      </View>
    </View>
  );
}

const labelStyle = (c) => ({
  fontFamily: "DMSans_600SemiBold",
  fontSize: 10,
  fontWeight: "700",
  color: c.textMuted,
  letterSpacing: 0.7,
  textTransform: "uppercase",
});

// ── Bank dropdown modal ───────────────────────────────────────────────
function BankDropdown({ banks, value, onChange, loading, placeholder, c }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = banks.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.includes(search),
  );

  const selected = banks.find((b) => b.code === value);

  const grouped = !search.trim()
    ? ["digital", "commercial", "microfinance", "merchant"]
        .map((type) => ({
          type,
          items: filtered.filter((b) => (b.type ?? "commercial") === type),
        }))
        .filter((g) => g.items.length > 0)
    : null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={loading}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: 10,
            backgroundColor: c.bgInput || c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 8,
            opacity: loading ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <AppText
              style={{ fontSize: 12, color: c.textMuted, fontStyle: "italic" }}
            >
              Loading banks…
            </AppText>
          ) : selected ? (
            <AppText
              numberOfLines={1}
              style={{ fontSize: 12, fontWeight: "600", color: c.text }}
            >
              {selected.name}
            </AppText>
          ) : (
            <AppText style={{ fontSize: 12, color: c.textMuted }}>
              {placeholder ?? "Select bank"}
            </AppText>
          )}
        </View>
        <FaChevronDown size={12} color={c.textMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.78)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: c.bgPanel,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "85%",
              paddingBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 15,
                  fontWeight: "800",
                  color: c.text,
                }}
              >
                Select Bank
              </AppText>
              <Pressable onPress={() => setOpen(false)} hitSlop={6}>
                <FaTimes size={16} color={c.textDim} />
              </Pressable>
            </View>

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              <FaSearch size={13} color={c.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                autoFocus
                placeholder={`Search ${banks.length} banks…`}
                placeholderTextColor={c.textMuted}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 12,
                  color: c.text,
                  paddingVertical: 4,
                }}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} hitSlop={6}>
                  <FaTimes size={12} color={c.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {filtered.length === 0 ? (
                <View
                  style={{ paddingVertical: 30, alignItems: "center", gap: 4 }}
                >
                  <FaSearch size={22} color={c.textMuted} />
                  <AppText style={{ fontSize: 12, color: c.textMuted }}>
                    {`No bank found for "${search}"`}
                  </AppText>
                </View>
              ) : search.trim() ? (
                filtered.map((b) => (
                  <BankOption
                    key={b.code}
                    bank={b}
                    selected={value === b.code}
                    onSelect={(b) => {
                      onChange(b);
                      setOpen(false);
                      setSearch("");
                    }}
                    c={c}
                  />
                ))
              ) : (
                grouped?.map((g) => (
                  <View key={g.type}>
                    <AppText
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        fontSize: 9,
                        fontWeight: "800",
                        color: BANK_TYPE_LABELS[g.type]?.color || c.textDim,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        backgroundColor: c.bgCard,
                        borderBottomWidth: 1,
                        borderBottomColor: c.border,
                      }}
                    >
                      {`${BANK_TYPE_LABELS[g.type]?.label || g.type} (${g.items.length})`}
                    </AppText>
                    {g.items.map((b) => (
                      <BankOption
                        key={b.code}
                        bank={b}
                        selected={value === b.code}
                        onSelect={(b) => {
                          onChange(b);
                          setOpen(false);
                          setSearch("");
                        }}
                        c={c}
                      />
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function BankOption({ bank, selected, onSelect, c }) {
  const typeMeta = BANK_TYPE_LABELS[bank.type ?? "commercial"];
  return (
    <Pressable
      onPress={() => onSelect(bank)}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          backgroundColor: selected
            ? c.orangeDim
            : pressed
              ? c.bgCard
              : "transparent",
        },
      ]}
    >
      <AppText
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 12,
          fontWeight: "500",
          color: selected ? c.orange : c.text,
        }}
      >
        {bank.name}
      </AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        {typeMeta ? (
          <AppText
            style={{ fontSize: 9, fontWeight: "700", color: typeMeta.color }}
          >
            {typeMeta.label}
          </AppText>
        ) : null}
        <AppText
          style={{
            fontSize: 10,
            color: c.textMuted,
            fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
          }}
        >
          {bank.code}
        </AppText>
      </View>
    </Pressable>
  );
}

// ── Worker-style Withdraw Modal ───────────────────────────────────────
function WorkerStyleWithdrawModal({
  isOpen,
  onClose,
  onWithdraw,
  loading,
  balance,
  currency,
  c,
}) {
  const [selMethod, setSelMethod] = useState(null);
  const [form, setForm] = useState({});
  const [amount, setAmount] = useState("");
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [verifiedName, setVerifiedName] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState(null);
  const [error, setError] = useState("");

  const methods = CURRENCY_METHODS[currency?.toUpperCase()] ?? INTL_METHODS;

  useEffect(() => {
    if (isOpen) {
      setSelMethod(methods[0]);
      setForm({});
      setVerifiedName(null);
      setVerifyErr("");
      setAmount("");
      setError("");
      setShowConfirm(false);
      setWithdrawalData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currency]);

  useEffect(() => {
    if (!selMethod?.hasBankList) {
      setBanks([]);
      return;
    }
    const country = selMethod.country ?? "NG";
    setBanksLoading(true);

    client
      .get("/payments/banks", { params: { country } })
      .then((r) => {
        const apiBanks = r.data.data?.banks ?? [];
        const unique = Array.from(
          new Map(apiBanks.map((b) => [b.code, b])).values(),
        );
        setBanks(
          unique
            .map((b) => ({ ...b, type: b.type || "commercial" }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch(() => {
        if (country === "NG") {
          const fallback = Array.from(
            new Map(NIGERIAN_BANKS.map((b) => [b.code, b])).values(),
          );
          setBanks(fallback);
        } else {
          setBanks([]);
          setError("Could not load bank list. Please try again later.");
        }
      })
      .finally(() => setBanksLoading(false));
  }, [selMethod]);

  useEffect(() => {
    setVerifiedName(null);
    setVerifyErr("");
  }, [form.accountNumber, form.bankCode]);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const verifyAccount = async () => {
    if (!form.accountNumber || !form.bankCode) {
      setVerifyErr("Enter account number and select a bank first.");
      return;
    }
    setVerifying(true);
    setVerifyErr("");
    setVerifiedName(null);
    try {
      const res = await client.post("/payments/verify-account", {
        accountNumber: form.accountNumber,
        bankCode: form.bankCode,
        country: selMethod?.country ?? "NG",
      });
      setVerifiedName(res.data.data.accountName);
    } catch (e) {
      setVerifyErr(
        e.response?.data?.message ?? "Account not found. Check details.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleReview = () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    if (amt < 1) return setError("Minimum withdrawal is 1 unit.");
    if (amt > balance)
      return setError(
        `Exceeds available balance (${formatCurrency(balance, currency)}).`,
      );
    if (!selMethod) return setError("Select a payout method.");

    const m = selMethod.method;
    if (m === "bank_transfer" && !selMethod.isInternational) {
      if (!form.bankCode) return setError("Select a bank.");
      if (!form.accountNumber) return setError("Enter account number.");
      if (!verifiedName)
        return setError("Verify your account name before proceeding.");
    }
    if (m === "bank_transfer" && selMethod.isInternational) {
      if (!form.accountNumber) return setError("Enter account / IBAN number.");
      if (!form.swiftBic) return setError("Enter SWIFT / BIC code.");
      if (!form.accountName) return setError("Enter account holder name.");
    }
    if (m === "mobile_money") {
      if (!form.mobileNumber) return setError("Enter mobile number.");
    }
    if (m === "crypto") {
      if (!form.cryptoAddress) return setError("Enter wallet address.");
      if (!form.cryptoToken) return setError("Select crypto token.");
      if (!form.cryptoNetwork) return setError("Select network.");
    }

    const payload = {
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
    } else if (m === "bank_transfer" && selMethod.isInternational) {
      Object.assign(payload, {
        bankCode: form.swiftBic,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        swiftBic: form.swiftBic,
        routingNumber: form.routingNumber ?? "",
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

    setWithdrawalData(payload);
    setShowConfirm(true);
  };

  const handleConfirmWithdrawal = (confirmedPin) => {
    if (!withdrawalData) return;
    onWithdraw({ ...withdrawalData, pin: confirmedPin });
    setShowConfirm(false);
  };

  if (!isOpen) return null;

  const symbol = getCurrencySymbol(currency);

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.78)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: c.bgPanel,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "95%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 16,
                  fontWeight: "800",
                  color: c.text,
                }}
              >
                Request Payout
              </AppText>
              <Pressable onPress={onClose} hitSlop={6}>
                <FaTimes size={16} color={c.textDim} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              {/* Currency bar */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: c.orangeDim,
                      borderWidth: 1,
                      borderColor: c.orange,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AppText
                      style={{
                        fontFamily: "Syne_800ExtraBold",
                        fontSize: 12,
                        fontWeight: "800",
                        color: c.orange,
                      }}
                    >
                      {symbol}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText
                      style={{ fontSize: 12, fontWeight: "700", color: c.text }}
                    >
                      {`${currency} Wallet`}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 10,
                        color: c.textMuted,
                        letterSpacing: 0.3,
                      }}
                    >
                      {currency}
                    </AppText>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText
                    style={{
                      fontSize: 9,
                      color: c.textMuted,
                      letterSpacing: 0.5,
                    }}
                  >
                    AVAILABLE
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    style={{
                      fontFamily: "Syne_800ExtraBold",
                      fontSize: 13,
                      fontWeight: "800",
                      color: c.orange,
                    }}
                  >
                    {formatCurrency(balance, currency)}
                  </AppText>
                </View>
              </View>

              {/* Method grid */}
              <View>
                <AppText style={labelStyle(c)}>PAYOUT METHOD</AppText>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {methods.map((m) => {
                    const Icon = m.Icon;
                    const active = selMethod?.key === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        onPress={() => {
                          setSelMethod(m);
                          setForm({});
                          setVerifiedName(null);
                        }}
                        style={({ pressed }) => [
                          {
                            flexBasis: "48%",
                            flexGrow: 1,
                            padding: 10,
                            backgroundColor: active ? c.orangeDim : c.bgCard,
                            borderWidth: 1,
                            borderColor: active ? c.orange : c.border,
                            borderRadius: 12,
                            alignItems: "center",
                            gap: 3,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Icon size={18} color={active ? c.orange : c.textDim} />
                        <AppText
                          numberOfLines={2}
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: active ? c.orange : c.text,
                            textAlign: "center",
                          }}
                        >
                          {m.label}
                        </AppText>
                        <AppText
                          numberOfLines={2}
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
              </View>

              {/* Method-specific fields */}
              {selMethod?.method === "bank_transfer" &&
              !selMethod.isInternational ? (
                <View style={{ gap: 10 }}>
                  <AppText style={labelStyle(c)}>PAYOUT DETAILS</AppText>
                  <View>
                    <AppText style={fieldLabel(c)}>Bank / Fintech *</AppText>
                    <BankDropdown
                      banks={banks}
                      loading={banksLoading}
                      value={form.bankCode}
                      onChange={(b) => {
                        setF("bankCode", b.code);
                        setF("bankName", b.name);
                      }}
                      placeholder="Select bank, Kuda, OPay…"
                      c={c}
                    />
                  </View>
                  <View>
                    <AppText style={fieldLabel(c)}>Account Number *</AppText>
                    <TextInput
                      value={form.accountNumber ?? ""}
                      onChangeText={(t) => setF("accountNumber", t)}
                      keyboardType="numeric"
                      maxLength={12}
                      placeholder="0123456789"
                      placeholderTextColor={c.textMuted}
                      style={inputStyle(c)}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {verifiedName ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            backgroundColor: c.greenDim,
                            borderWidth: 1,
                            borderColor: "rgba(34,197,94,0.2)",
                            borderRadius: 8,
                          }}
                        >
                          <FaCheckCircle size={12} color={c.green} />
                          <AppText
                            style={{
                              flex: 1,
                              fontSize: 11,
                              fontWeight: "700",
                              color: c.green,
                            }}
                            numberOfLines={1}
                          >
                            {verifiedName}
                          </AppText>
                        </View>
                      ) : verifyErr ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            backgroundColor: c.redDim,
                            borderWidth: 1,
                            borderColor: "rgba(239,68,68,0.2)",
                            borderRadius: 8,
                          }}
                        >
                          <FaExclamationTriangle size={11} color={c.red} />
                          <AppText
                            style={{ flex: 1, fontSize: 11, color: c.red }}
                            numberOfLines={1}
                          >
                            {verifyErr}
                          </AppText>
                        </View>
                      ) : (
                        <AppText style={{ fontSize: 11, color: c.textMuted }}>
                          Verify to confirm account holder name
                        </AppText>
                      )}
                    </View>
                    <Pressable
                      onPress={verifyAccount}
                      disabled={
                        verifying || !form.accountNumber || !form.bankCode
                      }
                      style={({ pressed }) => [
                        {
                          paddingHorizontal: 14,
                          paddingVertical: 9,
                          backgroundColor: c.bgCard,
                          borderWidth: 1,
                          borderColor: c.border,
                          borderRadius: 8,
                          opacity:
                            verifying || !form.accountNumber || !form.bankCode
                              ? 0.4
                              : pressed
                                ? 0.85
                                : 1,
                        },
                      ]}
                    >
                      <AppText
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: c.textDim,
                        }}
                      >
                        {verifying ? "…" : "Verify"}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {selMethod?.method === "bank_transfer" &&
              selMethod.isInternational ? (
                <View style={{ gap: 10 }}>
                  <AppText style={labelStyle(c)}>PAYOUT DETAILS</AppText>
                  {[
                    {
                      key: "bankName",
                      label: "Bank Name *",
                      placeholder: "e.g. Bank of America",
                    },
                    {
                      key: "accountNumber",
                      label: "Account / IBAN *",
                      placeholder: "IBAN or account number",
                    },
                    {
                      key: "swiftBic",
                      label: "SWIFT / BIC *",
                      placeholder: "e.g. BOFAUS3N",
                    },
                    {
                      key: "routingNumber",
                      label: "Routing (US/CA)",
                      placeholder: "9-digit routing",
                    },
                    {
                      key: "accountName",
                      label: "Account Holder Name *",
                      placeholder: "Full name on account",
                    },
                    {
                      key: "bankCountry",
                      label: "Bank Country *",
                      placeholder: "e.g. United States",
                    },
                  ].map(({ key, label, placeholder }) => (
                    <View key={key}>
                      <AppText style={fieldLabel(c)}>{label}</AppText>
                      <TextInput
                        value={form[key] ?? ""}
                        onChangeText={(t) => setF(key, t)}
                        placeholder={placeholder}
                        placeholderTextColor={c.textMuted}
                        style={inputStyle(c)}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              {selMethod?.method === "mobile_money" ? (
                <View style={{ gap: 10 }}>
                  <AppText style={labelStyle(c)}>PAYOUT DETAILS</AppText>
                  <View>
                    <AppText style={fieldLabel(c)}>Mobile Number *</AppText>
                    <TextInput
                      value={form.mobileNumber ?? ""}
                      onChangeText={(t) => setF("mobileNumber", t)}
                      keyboardType="phone-pad"
                      placeholder="+234 800 000 0000"
                      placeholderTextColor={c.textMuted}
                      style={inputStyle(c)}
                    />
                  </View>
                  <View>
                    <AppText style={fieldLabel(c)}>
                      Account Name (optional)
                    </AppText>
                    <TextInput
                      value={form.mobileName ?? ""}
                      onChangeText={(t) => setF("mobileName", t)}
                      placeholder="Name on mobile account"
                      placeholderTextColor={c.textMuted}
                      style={inputStyle(c)}
                    />
                  </View>
                  {selMethod.provider ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: c.orangeDim,
                        borderWidth: 1,
                        borderColor: "rgba(249,115,22,0.2)",
                        borderRadius: 8,
                      }}
                    >
                      <FaUser size={11} color={c.orange} />
                      <AppText style={{ fontSize: 11, color: c.orange }}>
                        Provider:{" "}
                        <AppText style={{ fontWeight: "700" }}>
                          {selMethod.provider}
                        </AppText>
                      </AppText>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {selMethod?.method === "crypto" ? (
                <View style={{ gap: 10 }}>
                  <AppText style={labelStyle(c)}>PAYOUT DETAILS</AppText>
                  <View>
                    <AppText style={fieldLabel(c)}>Token *</AppText>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                    >
                      {CRYPTO_TOKENS.map((t) => (
                        <Pressable
                          key={t}
                          onPress={() => setF("cryptoToken", t)}
                          style={({ pressed }) => [
                            {
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              backgroundColor:
                                form.cryptoToken === t ? c.orangeDim : c.bgCard,
                              borderWidth: 1,
                              borderColor:
                                form.cryptoToken === t ? c.orange : c.border,
                              borderRadius: 8,
                              opacity: pressed ? 0.85 : 1,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color:
                                form.cryptoToken === t ? c.orange : c.textDim,
                            }}
                          >
                            {t}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View>
                    <AppText style={fieldLabel(c)}>Network *</AppText>
                    <View style={{ gap: 6 }}>
                      {CRYPTO_NETWORKS.map((n) => (
                        <Pressable
                          key={n.value}
                          onPress={() => setF("cryptoNetwork", n.value)}
                          style={({ pressed }) => [
                            {
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              backgroundColor:
                                form.cryptoNetwork === n.value
                                  ? c.orangeDim
                                  : c.bgCard,
                              borderWidth: 1,
                              borderColor:
                                form.cryptoNetwork === n.value
                                  ? c.orange
                                  : c.border,
                              borderRadius: 8,
                              opacity: pressed ? 0.85 : 1,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color:
                                form.cryptoNetwork === n.value
                                  ? c.orange
                                  : c.textDim,
                            }}
                          >
                            {n.label}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View>
                    <AppText style={fieldLabel(c)}>Wallet Address *</AppText>
                    <TextInput
                      value={form.cryptoAddress ?? ""}
                      onChangeText={(t) => setF("cryptoAddress", t)}
                      placeholder="0x… or TRC20 address"
                      placeholderTextColor={c.textMuted}
                      style={[
                        inputStyle(c),
                        {
                          fontFamily:
                            Platform.OS === "ios" ? "Courier" : "monospace",
                          fontSize: 12,
                        },
                      ]}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: 10,
                      backgroundColor: "rgba(234,179,8,0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(234,179,8,0.25)",
                      borderRadius: 10,
                    }}
                  >
                    <FaExclamationTriangle size={13} color="#eab308" />
                    <AppText
                      style={{
                        flex: 1,
                        fontSize: 11,
                        color: "#eab308",
                        lineHeight: 16,
                      }}
                    >
                      Double-check the network matches your wallet. Sending to
                      the wrong network will result in permanent loss of funds.
                    </AppText>
                  </View>
                </View>
              ) : null}

              {/* Amount */}
              <View>
                <AppText
                  style={labelStyle(c)}
                >{`AMOUNT (${currency})`}</AppText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: c.bgInput || c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    marginTop: 6,
                  }}
                >
                  <AppText
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      fontSize: 12,
                      fontWeight: "700",
                      color: c.textMuted,
                      backgroundColor: c.bgCard,
                      borderRightWidth: 1,
                      borderRightColor: c.border,
                    }}
                  >
                    {symbol}
                  </AppText>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={c.textMuted}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      fontSize: 16,
                      fontFamily: "Syne_700Bold",
                      fontWeight: "700",
                      color: c.text,
                    }}
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                  {[0.25, 0.5, 0.75, 1].map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => setAmount((balance * f).toFixed(2))}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          paddingVertical: 7,
                          backgroundColor: c.bgCard,
                          borderWidth: 1,
                          borderColor: c.border,
                          borderRadius: 6,
                          alignItems: "center",
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <AppText
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: c.textMuted,
                        }}
                      >
                        {f === 1 ? "Max" : `${f * 100}%`}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                {amount && parseFloat(amount) > 0
                  ? (() => {
                      const { netAmount, feePercent } = getWalletWithdrawalFee(
                        amount,
                        currency,
                      );
                      return (
                        <View
                          style={{
                            marginTop: 8,
                            padding: 8,
                            backgroundColor: c.bgCard,
                            borderWidth: 1,
                            borderColor: c.border,
                            borderRadius: 8,
                          }}
                        >
                          <AppText style={{ fontSize: 11, color: c.textMuted }}>
                            You receive approx.{" "}
                            <AppText
                              style={{ fontWeight: "700", color: c.green }}
                            >
                              {formatCurrency(netAmount, currency)}
                            </AppText>{" "}
                            after {feePercent}% fee
                          </AppText>
                        </View>
                      );
                    })()
                  : null}
              </View>

              {error ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    padding: 10,
                    backgroundColor: c.redDim,
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.3)",
                    borderRadius: 8,
                  }}
                >
                  <FaExclamationTriangle size={13} color={c.red} />
                  <AppText style={{ flex: 1, fontSize: 12, color: c.red }}>
                    {error}
                  </AppText>
                </View>
              ) : null}

              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  padding: 10,
                  backgroundColor: c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 10,
                }}
              >
                <FaInfoCircle size={13} color={c.textMuted} />
                <AppText
                  style={{
                    flex: 1,
                    fontSize: 11,
                    color: c.textDim,
                    lineHeight: 16,
                  }}
                >
                  {`Payouts processed within 1–3 business days · ${getWalletWithdrawalFee(1, currency).feePercent}% withdrawal fee applies · Crypto is USDC/USDT equivalent · Minimum: 1 ${currency}`}
                </AppText>
              </View>

              <Pressable
                onPress={handleReview}
                disabled={loading || !amount || !selMethod}
                style={({ pressed }) => [
                  {
                    paddingVertical: 14,
                    backgroundColor: c.orange,
                    borderRadius: 12,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 6,
                    opacity:
                      loading || !amount || !selMethod
                        ? 0.5
                        : pressed
                          ? 0.85
                          : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <FaArrowUp size={14} color="#000" />
                    <AppText
                      style={{
                        fontFamily: "Syne_800ExtraBold",
                        fontSize: 14,
                        fontWeight: "800",
                        color: "#000",
                      }}
                    >
                      Review Withdrawal
                    </AppText>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <WithdrawalConfirmModal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setWithdrawalData(null);
        }}
        onConfirm={handleConfirmWithdrawal}
        loading={loading}
        withdrawalData={withdrawalData}
        c={c}
      />
    </>
  );
}

const fieldLabel = (c) => ({
  fontFamily: "DMSans_500Medium",
  fontSize: 11,
  color: c.textDim,
  fontWeight: "500",
  marginBottom: 4,
});

const inputStyle = (c) => ({
  backgroundColor: c.bgInput || c.bgCard,
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 13,
  color: c.text,
  fontFamily: "DMSans_400Regular",
});

// ── Message Modal ──────────────────────────────────────────────────────
function MessageModal({
  isOpen,
  onClose,
  title,
  message,
  type = "success",
  c,
}) {
  if (!isOpen) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 18,
            padding: 20,
            alignItems: "center",
            gap: 12,
          }}
        >
          {type === "success" ? (
            <FaCheckCircle size={44} color={c.green} />
          ) : type === "error" ? (
            <FaTimesCircle size={44} color={c.red} />
          ) : (
            <FaClock size={44} color={c.orange} />
          )}
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 16,
              fontWeight: "800",
              color: c.text,
              textAlign: "center",
            }}
          >
            {title}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              lineHeight: 19,
            }}
          >
            {message}
          </AppText>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              {
                marginTop: 6,
                paddingVertical: 10,
                paddingHorizontal: 32,
                backgroundColor: c.orange,
                borderRadius: 10,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 13,
                fontWeight: "800",
                color: "#000",
              }}
            >
              Got it
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Select-like picker modal ─────────────────────────────────────────
function SelectModal({ open, onClose, title, options, value, onSelect, c }) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          padding: 24,
        }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            padding: 8,
            maxHeight: 400,
          }}
        >
          <AppText
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontFamily: "Syne_700Bold",
              fontSize: 13,
              fontWeight: "700",
              color: c.text,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            {title}
          </AppText>
          <ScrollView>
            {options.map((opt) => {
              const active = value === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      backgroundColor: active
                        ? c.orangeDim
                        : pressed
                          ? c.bgCard
                          : "transparent",
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: active ? "700" : "500",
                      color: active ? c.orange : c.text,
                    }}
                  >
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── MAIN SCREEN ────────────────────────────────────────────────────────
export default function HirerWalletScreen({ navigation }) {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currencies, setCurrencies] = useState(["NGN"]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageConfig, setMessageConfig] = useState({
    title: "",
    message: "",
    type: "success",
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCurrency, setActiveCurrency] = useState("NGN");
  const [currencyBalances, setCurrencyBalances] = useState({ NGN: 0 });
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const pendingVerifyRef = useRef(null);
  const isFirstRender = useRef(true);
  const hasMounted = useRef(false);

  const titleSize = Math.min(30, Math.max(22, width * 0.05));
  const balanceSize = Math.min(40, Math.max(24, width * 0.08));

  const showMessage = (title, message, type = "success") => {
    setMessageConfig({ title, message, type });
    setShowMessageModal(true);
  };

  const fetchWallet = useCallback(
    async (showLoadingState = true) => {
      if (showLoadingState) setLoading(true);
      setRefreshing(true);
      try {
        let balances = { NGN: 0 };
        let supported = ["NGN"];
        let walletData = {
          balance: 0,
          currency: "NGN",
          totalDeposited: 0,
          totalSpent: 0,
          totalWithdrawn: 0,
        };

        try {
          const balanceRes = await client.get("/wallet/balances");
          if (balanceRes.data?.data?.balances) {
            const raw = balanceRes.data.data.balances;
            if (raw.NGN) {
              const ngn = raw.NGN;
              walletData = {
                balance:
                  typeof ngn.balance === "number"
                    ? ngn.balance
                    : parseFloat(ngn.balance) || 0,
                currency: "NGN",
                totalDeposited:
                  typeof ngn.totalDeposited === "number"
                    ? ngn.totalDeposited
                    : parseFloat(ngn.totalDeposited) || 0,
                totalSpent:
                  typeof ngn.totalSpent === "number"
                    ? ngn.totalSpent
                    : parseFloat(ngn.totalSpent) || 0,
                totalWithdrawn:
                  typeof ngn.totalWithdrawn === "number"
                    ? ngn.totalWithdrawn
                    : parseFloat(ngn.totalWithdrawn) || 0,
              };
            }
            Object.keys(raw).forEach((key) => {
              const val = raw[key];
              if (typeof val === "object" && val !== null) {
                balances[key] =
                  typeof val.balance === "number"
                    ? val.balance
                    : parseFloat(val.balance) || 0;
              } else {
                balances[key] =
                  typeof val === "number" ? val : parseFloat(val) || 0;
              }
            });
          }
          if (balanceRes.data?.data?.currencies)
            supported = balanceRes.data.data.currencies;
        } catch (err) {
          const status = err.response?.status;
          if (status === 404 || status === 500) {
            const walletRes = await client.get("/wallet/balance");
            walletData = walletRes.data.data;
            balances = { NGN: walletData.balance || 0 };
          } else {
            throw err;
          }
        }

        try {
          const currRes = await client.get("/wallet/currencies");
          if (currRes.data?.data?.currencies)
            supported = currRes.data.data.currencies;
        } catch {}

        supported.forEach((cur) => {
          if (balances[cur] === undefined) balances[cur] = 0;
        });

        setWallet(walletData);
        setCurrencyBalances(balances);
        setCurrencies(supported);

        const txRes = await client.get("/wallet/transactions", {
          params: {
            page: pagination.page,
            limit: pagination.limit,
            type: filterType || undefined,
            status: filterStatus || undefined,
          },
        });
        const txData = txRes.data.data;
        setTransactions(txData.transactions || []);
        setPagination(
          txData.pagination || { page: 1, limit: 20, total: 0, pages: 1 },
        );

        const activeCur =
          Object.keys(balances).find((cur) => balances[cur] > 0) || "NGN";
        setActiveCurrency(activeCur);
      } catch (err) {
        if (err.response?.status === 404) {
          setWallet({
            balance: 0,
            currency: "NGN",
            totalDeposited: 0,
            totalSpent: 0,
            totalWithdrawn: 0,
          });
          setCurrencyBalances({ NGN: 0 });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pagination.page, filterType, filterStatus],
  );

  // Mount: check pending deposit ref, then fetch
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    (async () => {
      try {
        const pendingRef = await AsyncStorage.getItem(PENDING_REF_KEY);
        if (pendingRef && !pendingVerifyRef.current) {
          pendingVerifyRef.current = pendingRef;
          try {
            const res = await client.get(`/wallet/verify/${pendingRef}`);
            const status = res.data.data?.status;
            if (status === "SUCCESS") {
              showMessage(
                "Deposit Confirmed 🎉",
                `Your wallet has been funded with ${formatCurrency(res.data.data.amount, res.data.data.currency)}.`,
                "success",
              );
              await AsyncStorage.removeItem(PENDING_REF_KEY);
            } else if (status === "FAILED") {
              showMessage(
                "Deposit Failed",
                "Your deposit attempt did not complete. Please try again.",
                "error",
              );
              await AsyncStorage.removeItem(PENDING_REF_KEY);
            }
          } catch {}
        }
      } catch {}
      await fetchWallet(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination / filter change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchWallet(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filterType, filterStatus]);

  const getCurrentBalance = () => {
    const bal = currencyBalances[activeCurrency];
    return typeof bal === "number" ? bal : parseFloat(bal) || 0;
  };

  // ── Deposit ──────────────────────────────────────────────────────────
  const handleDeposit = async (amount, currency) => {
    setSubmitting(true);
    try {
      const res = await client.post("/wallet/fund", { amount, currency });
      const { paymentLink, reference } = res.data.data;

      if (!paymentLink) {
        showMessage(
          "Payment Initiated",
          "Please check your email for payment instructions.",
          "info",
        );
        setShowDepositModal(false);
        return;
      }

      setShowDepositModal(false);
      await AsyncStorage.setItem(PENDING_REF_KEY, reference);
      try {
        await Linking.openURL(paymentLink);
      } catch {
        showMessage(
          "Cannot open browser",
          `Please open this link: ${paymentLink}`,
          "info",
        );
      }

      // Poll
      let attempts = 0;
      const maxAttempts = 60;
      let finished = false;
      const baseline = currencyBalances[currency] || 0;

      client.get(`/wallet/verify/${reference}`).catch(() => {});

      const poll = setInterval(async () => {
        if (finished) return;
        attempts++;
        try {
          const balanceRes = await client.get("/wallet/balance", {
            params: { currency },
          });
          const bal = Number(balanceRes.data.data?.balance) || 0;
          if (bal >= baseline + amount - 0.01) {
            finished = true;
            clearInterval(poll);
            await AsyncStorage.removeItem(PENDING_REF_KEY);
            showMessage(
              "Deposit Confirmed 🎉",
              `Your wallet has been funded with ${formatCurrency(amount, currency)}.`,
              "success",
            );
            await fetchWallet(false);
            return;
          }
          if (attempts % 10 === 0) {
            try {
              const verifyRes = await client.get(`/wallet/verify/${reference}`);
              if (verifyRes.data.data?.status === "SUCCESS") {
                finished = true;
                clearInterval(poll);
                await AsyncStorage.removeItem(PENDING_REF_KEY);
                showMessage(
                  "Deposit Confirmed 🎉",
                  `Your wallet has been funded with ${formatCurrency(amount, currency)}.`,
                  "success",
                );
                await fetchWallet(false);
                return;
              }
            } catch {}
          }
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            showMessage(
              "Verification Pending",
              `We're still waiting to confirm your payment. Your wallet will update automatically once confirmed. If you don't see it within 10 minutes, contact support with reference: ${reference}`,
              "info",
            );
          }
        } catch {}
      }, 5000);
    } catch (err) {
      showMessage(
        "Deposit Failed",
        err.response?.data?.message || "Failed to initiate deposit",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Withdraw ─────────────────────────────────────────────────────────
  const handleWithdraw = async (data) => {
    setSubmitting(true);
    try {
      const res = await client.post("/wallet/withdraw", data);
      const { fee, netAmount } = getWalletWithdrawalFee(
        data.amount,
        data.currency,
      );
      showMessage(
        "Withdrawal Request Submitted ✅",
        `Your withdrawal of ${formatCurrency(data.amount, data.currency)} has been submitted for admin approval.\n\nFee: ${formatCurrency(fee, data.currency)}\nNet Amount: ${formatCurrency(netAmount, data.currency)}\nReference: ${res.data.data.reference}`,
        "success",
      );
      setShowWithdrawModal(false);
      await fetchWallet(false);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || "Failed to process withdrawal";
      if (status === 401 || status === 403 || status === 429) {
        showMessage("PIN Verification Failed", msg, "error");
      } else {
        showMessage("Withdrawal Failed", msg, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Client-side currency + search filter
  const filteredTransactions = transactions.filter((tx) => {
    if (activeCurrency && tx.currency && tx.currency !== activeCurrency)
      return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.reference?.toLowerCase().includes(q) ||
      tx.description?.toLowerCase().includes(q) ||
      getTransactionLabel(tx.type).toLowerCase().includes(q)
    );
  });

  const currentBalance = getCurrentBalance();
  const hasBalance = currentBalance > 0;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <WalletSkeleton c={c} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchWallet(false)}
            tintColor={c.orange}
            colors={[c.orange]}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <FaWallet size={22} color={c.orange} />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: titleSize,
                  fontWeight: "900",
                  color: c.text,
                  letterSpacing: -0.5,
                }}
              >
                Wallet
              </AppText>
            </View>
            <AppText
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 12,
                color: c.textDim,
                marginTop: 4,
              }}
            >
              Manage your funds across multiple currencies
            </AppText>
          </View>
          <Pressable
            onPress={() => fetchWallet(false)}
            disabled={refreshing}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                opacity: refreshing ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={c.orange} />
            ) : (
              <FaArrowRight
                size={16}
                color={c.textDim}
                style={{ transform: [{ rotate: "-90deg" }] }}
              />
            )}
          </Pressable>
        </View>

        {/* Currency tabs */}
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            padding: 8,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {currencies.map((cur) => {
              const bal = currencyBalances[cur] || 0;
              return (
                <CurrencyTab
                  key={cur}
                  currency={cur}
                  balance={bal}
                  isActive={cur === activeCurrency}
                  onPress={() => setActiveCurrency(cur)}
                  c={c}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* Balance card */}
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1.5,
            borderColor: c.orangeGlow,
            borderRadius: 18,
            padding: 20,
            gap: 14,
          }}
        >
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <AppText
                style={{
                  fontFamily: "DMSans_600SemiBold",
                  fontSize: 10,
                  fontWeight: "700",
                  color: c.textMuted,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                {`Available Balance (${activeCurrency})`}
              </AppText>
              {!hasBalance ? (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 1,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 999,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 9,
                      fontWeight: "600",
                      color: c.textMuted,
                    }}
                  >
                    Empty
                  </AppText>
                </View>
              ) : null}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 4,
              }}
            >
              <AppText
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: balanceSize,
                  fontWeight: "900",
                  color: c.orange,
                  letterSpacing: -0.5,
                  lineHeight: balanceSize * 1.1,
                }}
              >
                {formatCurrency(currentBalance, activeCurrency)}
              </AppText>
              {currentBalance > 0 ? (
                <CopyButton
                  text={`${getCurrencySymbol(activeCurrency)}${currentBalance.toFixed(2)}`}
                  c={c}
                />
              ) : null}
            </View>
            {currencies.some((cur) => (currencyBalances[cur] || 0) > 0) ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 6,
                }}
              >
                {currencies.map((cur) => {
                  const bal = currencyBalances[cur] || 0;
                  if (bal === 0) return null;
                  return (
                    <AppText
                      key={cur}
                      style={{ fontSize: 11, color: c.textMuted }}
                    >
                      {`${cur}: ${formatCurrency(bal, cur)}`}
                    </AppText>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setShowDepositModal(true)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 12,
                  backgroundColor: c.orange,
                  borderRadius: 10,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaPlus size={12} color="#000" />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 13,
                  fontWeight: "800",
                  color: "#000",
                }}
              >
                Add Money
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => hasBalance && setShowWithdrawModal(true)}
              disabled={!hasBalance}
              style={({ pressed }) => [
                {
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  backgroundColor: hasBalance ? c.bgCard : c.bgCard,
                  borderColor: c.border,
                  opacity: !hasBalance ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaMinus size={12} color={hasBalance ? c.text : c.textMuted} />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 13,
                  fontWeight: "800",
                  color: hasBalance ? c.text : c.textMuted,
                }}
              >
                Withdraw
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <View style={{ width: "48.5%", minWidth: 0 }}>
            <StatCard
              Icon={FaArrowDown}
              label="Total Deposits"
              value={formatCurrency(wallet?.totalDeposited || 0, "NGN")}
              accent="green"
              c={c}
            />
          </View>
          <View style={{ width: "48.5%", minWidth: 0 }}>
            <StatCard
              Icon={FaCreditCard}
              label="Total Spent"
              value={formatCurrency(wallet?.totalSpent || 0, "NGN")}
              accent="orange"
              c={c}
            />
          </View>
          <View style={{ width: "48.5%", minWidth: 0 }}>
            <StatCard
              Icon={FaArrowUp}
              label="Total Withdrawn"
              value={formatCurrency(wallet?.totalWithdrawn || 0, "NGN")}
              c={c}
            />
          </View>
          <View style={{ width: "48.5%", minWidth: 0 }}>
            <StatCard
              Icon={FaClock}
              label="Transactions"
              value={String(pagination.total || 0)}
              c={c}
            />
          </View>
        </View>

        {/* Transactions section */}
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              padding: 14,
              gap: 10,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <AppText
              style={{
                fontFamily: "Syne_700Bold",
                fontSize: 14,
                fontWeight: "800",
                color: c.text,
              }}
            >
              {activeCurrency
                ? `Transaction History (${activeCurrency})`
                : "Transaction History"}
            </AppText>

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <FaSearch size={12} color={c.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search transactions..."
                placeholderTextColor={c.textMuted}
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: c.text,
                  paddingVertical: 6,
                }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setTypeFilterOpen(true)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 11, fontWeight: "600", color: c.text }}
                  numberOfLines={1}
                >
                  {filterType || "All Types"}
                </AppText>
                <FaChevronDown size={10} color={c.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => setStatusFilterOpen(true)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 11, fontWeight: "600", color: c.text }}
                  numberOfLines={1}
                >
                  {filterStatus || "All Statuses"}
                </AppText>
                <FaChevronDown size={10} color={c.textMuted} />
              </Pressable>
            </View>
          </View>

          {filteredTransactions.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 40,
                paddingHorizontal: 20,
                gap: 8,
              }}
            >
              <FaWallet
                size={44}
                color={c.textMuted}
                style={{ opacity: 0.4 }}
              />
              <AppText
                style={{
                  fontFamily: "Syne_700Bold",
                  fontSize: 15,
                  fontWeight: "700",
                  color: c.text,
                }}
              >
                No transactions found
              </AppText>
              <AppText
                style={{
                  fontSize: 12,
                  color: c.textMuted,
                  textAlign: "center",
                }}
              >
                {`Your transaction history for ${activeCurrency} will appear here`}
              </AppText>
            </View>
          ) : (
            <View style={{ padding: 12, gap: 8 }}>
              {filteredTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  onPress={() =>
                    navigation?.navigate?.("WalletTransactionDetail", {
                      id: tx.id,
                    })
                  }
                  c={c}
                  format={formatCurrency}
                />
              ))}
            </View>
          )}

          {/* Pagination */}
          {pagination.pages > 1 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                padding: 14,
                borderTopWidth: 1,
                borderTopColor: c.border,
              }}
            >
              <Pressable
                disabled={pagination.page === 1}
                onPress={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    opacity: pagination.page === 1 ? 0.3 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                <FaArrowLeft size={10} color={c.textDim} />
                <AppText
                  style={{ fontSize: 11, fontWeight: "600", color: c.textDim }}
                >
                  Prev
                </AppText>
              </Pressable>
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                {`Page ${pagination.page} of ${pagination.pages}`}
              </AppText>
              <Pressable
                disabled={pagination.page === pagination.pages}
                onPress={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    opacity:
                      pagination.page === pagination.pages
                        ? 0.3
                        : pressed
                          ? 0.75
                          : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 11, fontWeight: "600", color: c.textDim }}
                >
                  Next
                </AppText>
                <FaArrowRight size={10} color={c.textDim} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDeposit={handleDeposit}
        loading={submitting}
        currencies={currencies}
        c={c}
      />

      <WorkerStyleWithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onWithdraw={handleWithdraw}
        loading={submitting}
        balance={currentBalance}
        currency={activeCurrency}
        c={c}
      />

      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageConfig.title}
        message={messageConfig.message}
        type={messageConfig.type}
        c={c}
      />

      <SelectModal
        open={typeFilterOpen}
        onClose={() => setTypeFilterOpen(false)}
        title="Filter by Type"
        options={[
          { value: "", label: "All Types" },
          { value: "DEPOSIT", label: "Deposits" },
          { value: "WITHDRAWAL", label: "Withdrawals" },
          { value: "PAYMENT", label: "Payments" },
          { value: "SUBSCRIPTION", label: "Subscriptions" },
          { value: "REFUND", label: "Refunds" },
        ]}
        value={filterType}
        onSelect={setFilterType}
        c={c}
      />

      <SelectModal
        open={statusFilterOpen}
        onClose={() => setStatusFilterOpen(false)}
        title="Filter by Status"
        options={[
          { value: "", label: "All Statuses" },
          { value: "PENDING", label: "Pending" },
          { value: "COMPLETED", label: "Completed" },
          { value: "FAILED", label: "Failed" },
          { value: "REVERSED", label: "Reversed" },
        ]}
        value={filterStatus}
        onSelect={setFilterStatus}
        c={c}
      />
    </SafeAreaView>
  );
}
