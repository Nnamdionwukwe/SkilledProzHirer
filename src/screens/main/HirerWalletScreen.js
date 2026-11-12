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
import { useTranslation } from "react-i18next";

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

// Symbol-prefixed currency formatter — no Intl (which renders the code on
// Hermes/Android). Uses CURRENCY_SYMBOLS for the prefix and toLocaleString
// for the numeric portion.
function formatCurrency(amount, currency = "NGN") {
  const numAmount =
    typeof amount === "number" ? amount : parseFloat(amount) || 0;
  const sym = getCurrencySymbol(currency || "NGN");
  const isCrypto = ["USDC", "USDT", "BTC", "ETH"].includes(currency);
  try {
    const formatted = numAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return isCrypto ? `${sym} ${formatted}` : `${sym}${formatted}`;
  } catch {
    return isCrypto
      ? `${sym} ${numAmount.toFixed(2)}`
      : `${sym}${numAmount.toFixed(2)}`;
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

// Status labels come from i18n so we can translate them.
function getStatusLabel(status, t) {
  const map = {
    PENDING: "wallet.status.pending",
    PROCESSING: "wallet.status.processing",
    COMPLETED: "wallet.status.completed",
    SUCCESS: "wallet.status.success",
    FAILED: "wallet.status.failed",
    REVERSED: "wallet.status.reversed",
    CANCELLED: "wallet.status.cancelled",
    INITIATED: "wallet.status.initiated",
  };
  const key = map[status];
  return key ? t(key) : status;
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

// Transaction label — translated via i18n.
function getTransactionLabel(type, t) {
  const map = {
    DEPOSIT: "wallet.txTypes.deposit",
    WITHDRAWAL: "wallet.txTypes.withdrawal",
    PAYMENT: "wallet.txTypes.payment",
    SUBSCRIPTION: "wallet.txTypes.subscription",
    REFUND: "wallet.txTypes.refund",
    BONUS: "wallet.txTypes.bonus",
    ADJUSTMENT: "wallet.txTypes.adjustment",
  };
  const key = map[type];
  return key ? t(key) : type;
}

function getPaymentChannel(tx, t) {
  if (tx.type === "DEPOSIT") {
    const p = tx.meta?.paymentProvider;
    if (p === "FLUTTERWAVE" || p === "PAYSTACK")
      return { label: t("wallet.channels.cardMobile"), Icon: FaCreditCard };
    return { label: t("wallet.channels.cardBank"), Icon: FaCreditCard };
  }
  if (tx.type === "WITHDRAWAL")
    return { label: t("wallet.channels.bankTransfer"), Icon: FaBuilding };
  if (tx.type === "PAYMENT") {
    const p = tx.meta?.paymentProvider || "WALLET";
    if (p === "WALLET")
      return { label: t("wallet.channels.wallet"), Icon: FaWallet };
    if (p === "PAYSTACK")
      return { label: t("wallet.channels.paystackCard"), Icon: FaCreditCard };
    if (p === "FLUTTERWAVE")
      return {
        label: t("wallet.channels.flutterwaveCard"),
        Icon: FaCreditCard,
      };
    if (p === "BANK_TRANSFER")
      return { label: t("wallet.channels.bankTransfer"), Icon: FaBuilding };
    if (p === "CRYPTO")
      return { label: t("wallet.channels.crypto"), Icon: FaDollarSign };
    return { label: t("wallet.channels.payment"), Icon: FaCreditCard };
  }
  if (tx.type === "SUBSCRIPTION")
    return { label: t("wallet.channels.subscription"), Icon: FaShieldAlt };
  if (tx.type === "REFUND")
    return { label: t("wallet.channels.refund"), Icon: FaArrowUp };
  if (tx.type === "BONUS")
    return { label: t("wallet.channels.bonus"), Icon: FaPlus };
  return { label: t("wallet.channels.adjustment"), Icon: FaMinus };
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
      labelKey: "wallet.methods.ngBank",
      Icon: FaCreditCard,
      descKey: "wallet.methodsDesc.ngBank",
      country: "NG",
      hasBankList: true,
    },
    {
      key: "ng_mtn",
      method: "mobile_money",
      labelKey: "wallet.methods.mtn",
      Icon: FaUser,
      descKey: "wallet.methodsDesc.mtn",
      country: "NG",
      provider: "MTN",
    },
    {
      key: "ng_airtel",
      method: "mobile_money",
      labelKey: "wallet.methods.airtel",
      Icon: FaUser,
      descKey: "wallet.methodsDesc.airtel",
      country: "NG",
      provider: "Airtel",
    },
    {
      key: "crypto",
      method: "crypto",
      labelKey: "wallet.methods.crypto",
      Icon: FaDollarSign,
      descKey: "wallet.methodsDesc.crypto",
    },
  ],
};

const INTL_METHODS = [
  {
    key: "intl_bank",
    method: "bank_transfer",
    labelKey: "wallet.methods.intlBank",
    Icon: FaGlobe,
    descKey: "wallet.methodsDesc.intlBank",
    isInternational: true,
  },
  {
    key: "crypto",
    method: "crypto",
    labelKey: "wallet.methods.crypto",
    Icon: FaDollarSign,
    descKey: "wallet.methodsDesc.crypto",
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
  commercial: { labelKey: "wallet.bankTypes.commercial", color: "#818cf8" },
  digital: { labelKey: "wallet.bankTypes.digital", color: "#f97316" },
  microfinance: { labelKey: "wallet.bankTypes.microfinance", color: "#22c55e" },
  merchant: { labelKey: "wallet.bankTypes.merchant", color: "#a78bfa" },
};

// ── CopyButton ─────────────────────────────────────────────────────────
function CopyButton({ text, label, c }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(String(text ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const shownLabel = label ?? t("wallet.copy.default");
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
        {copied ? t("wallet.copy.copied") : shownLabel}
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
          weight="displayBlack"
          style={{
            fontSize: 11,
            letterSpacing: -0.5,
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
  const { t } = useTranslation();
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
            {t("wallet.empty")}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── TransactionRow ─────────────────────────────────────────────────────
function TransactionRow({ transaction, onPress, c, format }) {
  const { t } = useTranslation();
  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountColor = isCredit ? c.green : c.red;
  const prefix = isCredit ? "+" : "-";
  const channel = getPaymentChannel(transaction, t);
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
              {getTransactionLabel(transaction.type, t)}
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
              weight="displayBlack"
              style={{
                fontSize: 11,
                color: amountColor,
                letterSpacing: -0.5,
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
            {getStatusLabel(transaction.status, t)}
          </AppText>
        </View>
        <FaChevronRight size={11} color={c.textMuted} />
      </View>
    </Pressable>
  );
}

// ── Deposit Modal ──────────────────────────────────────────────────────
function DepositModal({ isOpen, onClose, onDeposit, loading, currencies, c }) {
  const { t } = useTranslation();
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
        t("wallet.deposit.minimumTitle"),
        t("wallet.deposit.minimumBody", {
          amount: `${getCurrencySymbol(currency)}100`,
        }),
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
                {t("wallet.deposit.title")}
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
            {t("wallet.deposit.subtitle")}
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
            {t("wallet.deposit.currencyLabel")}
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
            {t("wallet.deposit.minimumHint", {
              amount: `${getCurrencySymbol(currency)}100`,
            })}
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
                {t("wallet.deposit.cancel")}
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
                  {t("wallet.deposit.proceed")}
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
  const { t } = useTranslation();
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
      setPinError(t("wallet.confirmWithdrawal.pinRequired"));
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
                  weight="displayBlack"
                  style={{
                    fontSize: 15,
                    letterSpacing: -0.5,
                  }}
                >
                  {t("wallet.confirmWithdrawal.title")}
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
                      fontSize: 10,
                      color: c.textDim,
                      lineHeight: 17,
                    }}
                  >
                    {t("wallet.confirmWithdrawal.disclaimerPrefix")}{" "}
                    <AppText
                      style={{ fontWeight: "700", fontSize: 10, color: c.text }}
                    >
                      {t("wallet.confirmWithdrawal.verifyBold")}
                    </AppText>{" "}
                    {t("wallet.confirmWithdrawal.disclaimerMiddle")}{" "}
                    <AppText
                      onPress={() =>
                        Linking.openURL("https://skilledproz.com/refund-policy")
                      }
                      style={{
                        fontWeight: "700",
                        fontSize: 10,
                        color: c.orange,
                        textDecorationLine: "underline",
                      }}
                    >
                      {t("wallet.confirmWithdrawal.refundPolicy")}
                    </AppText>
                    .
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
                  <AppText style={labelStyle(c)}>
                    {t("wallet.confirmWithdrawal.bankDetails")}
                  </AppText>
                  <Row
                    label={t("wallet.confirmWithdrawal.bank")}
                    value={bankName || "—"}
                    c={c}
                  />
                  <Row
                    label={t("wallet.confirmWithdrawal.accountNumber")}
                    value={accountNumber || "—"}
                    copy
                    c={c}
                  />
                  <Row
                    label={t("wallet.confirmWithdrawal.accountName")}
                    value={accountName || "—"}
                    c={c}
                  />
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
                  <AppText style={labelStyle(c)}>
                    {t("wallet.confirmWithdrawal.breakdown")}
                  </AppText>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <AppText style={{ fontSize: 12, color: c.textDim }}>
                      {t("wallet.confirmWithdrawal.amount")}
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
                      {t("wallet.confirmWithdrawal.platformFee", {
                        percent: feePercent,
                      })}
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
                      {t("wallet.confirmWithdrawal.youReceive")}
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
                  <AppText style={labelStyle(c)}>
                    {t("wallet.confirmWithdrawal.pinLabel")}
                  </AppText>
                  <TextInput
                    value={pin}
                    onChangeText={(v) => {
                      setPin(v.replace(/\D/g, "").slice(0, 4));
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
                    {t("wallet.confirmWithdrawal.pinHint")}
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
                    {t("wallet.confirmWithdrawal.adminNote")}
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
                      {t("wallet.confirmWithdrawal.cancel")}
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
                          {t("wallet.confirmWithdrawal.confirm")}
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
  const { t } = useTranslation();
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
              {t("wallet.banks.loading")}
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
              {placeholder ?? t("wallet.banks.selectPlaceholder")}
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
                {t("wallet.banks.selectTitle")}
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
                placeholder={t("wallet.banks.searchPlaceholder", {
                  count: banks.length,
                })}
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
                    {t("wallet.banks.noResults", { query: search })}
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
                      {t(
                        BANK_TYPE_LABELS[g.type]?.labelKey ||
                          "wallet.bankTypes.commercial",
                      )}{" "}
                      ({g.items.length})
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
  const { t } = useTranslation();
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
            {t(typeMeta.labelKey)}
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
  const { t } = useTranslation();
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
          setError(t("wallet.withdraw.errors.bankListFailed"));
        }
      })
      .finally(() => setBanksLoading(false));
  }, [selMethod, t]);

  useEffect(() => {
    setVerifiedName(null);
    setVerifyErr("");
  }, [form.accountNumber, form.bankCode]);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const verifyAccount = async () => {
    if (!form.accountNumber || !form.bankCode) {
      setVerifyErr(t("wallet.withdraw.errors.enterAccountAndBank"));
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
        e.response?.data?.message ??
          t("wallet.withdraw.errors.accountNotFound"),
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleReview = () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)
      return setError(t("wallet.withdraw.errors.validAmount"));
    if (amt < 1) return setError(t("wallet.withdraw.errors.minimum"));
    if (amt > balance)
      return setError(
        t("wallet.withdraw.errors.exceedsBalance", {
          balance: formatCurrency(balance, currency),
        }),
      );
    if (!selMethod) return setError(t("wallet.withdraw.errors.selectMethod"));

    const m = selMethod.method;
    if (m === "bank_transfer" && !selMethod.isInternational) {
      if (!form.bankCode)
        return setError(t("wallet.withdraw.errors.selectBank"));
      if (!form.accountNumber)
        return setError(t("wallet.withdraw.errors.enterAccount"));
      if (!verifiedName)
        return setError(t("wallet.withdraw.errors.verifyFirst"));
    }
    if (m === "bank_transfer" && selMethod.isInternational) {
      if (!form.accountNumber)
        return setError(t("wallet.withdraw.errors.enterIban"));
      if (!form.swiftBic)
        return setError(t("wallet.withdraw.errors.enterSwift"));
      if (!form.accountName)
        return setError(t("wallet.withdraw.errors.enterHolderName"));
    }
    if (m === "mobile_money") {
      if (!form.mobileNumber)
        return setError(t("wallet.withdraw.errors.enterMobile"));
    }
    if (m === "crypto") {
      if (!form.cryptoAddress)
        return setError(t("wallet.withdraw.errors.enterAddress"));
      if (!form.cryptoToken)
        return setError(t("wallet.withdraw.errors.selectToken"));
      if (!form.cryptoNetwork)
        return setError(t("wallet.withdraw.errors.selectNetwork"));
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
                weight="displayBlack"
                style={{
                  fontSize: 15,
                  letterSpacing: -0.5,
                }}
              >
                {t("wallet.withdraw.title")}
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
                      {t("wallet.withdraw.walletLabel", { currency })}
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
                    {t("wallet.withdraw.available")}
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    weight="displayBlack"
                    style={{
                      fontSize: 13,
                      letterSpacing: -0.5,
                      color: c.orange,
                    }}
                  >
                    {formatCurrency(balance, currency)}
                  </AppText>
                </View>
              </View>

              {/* Method grid */}
              <View>
                <AppText style={labelStyle(c)}>
                  {t("wallet.withdraw.methodLabel")}
                </AppText>
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
                          {t(m.labelKey)}
                        </AppText>
                        <AppText
                          numberOfLines={2}
                          style={{
                            fontSize: 9,
                            color: c.textMuted,
                            textAlign: "center",
                          }}
                        >
                          {t(m.descKey)}
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
                  <AppText style={labelStyle(c)}>
                    {t("wallet.withdraw.payoutDetails")}
                  </AppText>
                  <View>
                    <AppText style={fieldLabel(c)}>
                      {t("wallet.withdraw.bankLabel")}
                    </AppText>
                    <BankDropdown
                      banks={banks}
                      loading={banksLoading}
                      value={form.bankCode}
                      onChange={(b) => {
                        setF("bankCode", b.code);
                        setF("bankName", b.name);
                      }}
                      placeholder={t("wallet.banks.selectPlaceholder")}
                      c={c}
                    />
                  </View>
                  <View>
                    <AppText style={fieldLabel(c)}>
                      {t("wallet.withdraw.accountNumberLabel")}
                    </AppText>
                    <TextInput
                      value={form.accountNumber ?? ""}
                      onChangeText={(v) => setF("accountNumber", v)}
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
                          {t("wallet.withdraw.verifyHint")}
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
                        {verifying ? "…" : t("wallet.withdraw.verifyBtn")}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {selMethod?.method === "bank_transfer" &&
              selMethod.isInternational ? (
                <View style={{ gap: 10 }}>
                  <AppText style={labelStyle(c)}>
                    {t("wallet.withdraw.payoutDetails")}
                  </AppText>
                  {[
                    {
                      key: "bankName",
                      labelKey: "wallet.withdraw.fields.bankName",
                      placeholderKey: "wallet.withdraw.fields.bankNamePh",
                    },
                    {
                      key: "accountNumber",
                      labelKey: "wallet.withdraw.fields.iban",
                      placeholderKey: "wallet.withdraw.fields.ibanPh",
                    },
                    {
                      key: "swiftBic",
                      labelKey: "wallet.withdraw.fields.swift",
                      placeholderKey: "wallet.withdraw.fields.swiftPh",
                    },
                    {
                      key: "routingNumber",
                      labelKey: "wallet.withdraw.fields.routing",
                      placeholderKey: "wallet.withdraw.fields.routingPh",
                    },
                    {
                      key: "accountName",
                      labelKey: "wallet.withdraw.fields.holderName",
                      placeholderKey: "wallet.withdraw.fields.holderNamePh",
                    },
                    {
                      key: "bankCountry",
                      labelKey: "wallet.withdraw.fields.bankCountry",
                      placeholderKey: "wallet.withdraw.fields.bankCountryPh",
                    },
                  ].map(({ key, labelKey, placeholderKey }) => (
                    <View key={key}>
                      <AppText style={fieldLabel(c)}>{t(labelKey)}</AppText>
                      <TextInput
                        value={form[key] ?? ""}
                        onChangeText={(v) => setF(key, v)}
                        placeholder={t(placeholderKey)}
                        placeholderTextColor={c.textMuted}
                        style={inputStyle(c)}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              {selMethod?.method === "mobile_money" ? (
                <View style={{ gap: 10 }}>
                  <AppText style={labelStyle(c)}>
                    {t("wallet.withdraw.payoutDetails")}
                  </AppText>
                  <View>
                    <AppText style={fieldLabel(c)}>
                      {t("wallet.withdraw.fields.mobileNumber")}
                    </AppText>
                    <TextInput
                      value={form.mobileNumber ?? ""}
                      onChangeText={(v) => setF("mobileNumber", v)}
                      keyboardType="phone-pad"
                      placeholder={t("wallet.withdraw.fields.mobileNumberPh")}
                      placeholderTextColor={c.textMuted}
                      style={inputStyle(c)}
                    />
                  </View>
                  <View>
                    <AppText style={fieldLabel(c)}>
                      {t("wallet.withdraw.fields.mobileName")}
                    </AppText>
                    <TextInput
                      value={form.mobileName ?? ""}
                      onChangeText={(v) => setF("mobileName", v)}
                      placeholder={t("wallet.withdraw.fields.mobileNamePh")}
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
                        {t("wallet.withdraw.providerPrefix")}{" "}
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
                  <AppText style={labelStyle(c)}>
                    {t("wallet.withdraw.payoutDetails")}
                  </AppText>
                  <View>
                    <AppText style={fieldLabel(c)}>
                      {t("wallet.withdraw.fields.token")}
                    </AppText>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                    >
                      {CRYPTO_TOKENS.map((tk) => (
                        <Pressable
                          key={tk}
                          onPress={() => setF("cryptoToken", tk)}
                          style={({ pressed }) => [
                            {
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              backgroundColor:
                                form.cryptoToken === tk
                                  ? c.orangeDim
                                  : c.bgCard,
                              borderWidth: 1,
                              borderColor:
                                form.cryptoToken === tk ? c.orange : c.border,
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
                                form.cryptoToken === tk ? c.orange : c.textDim,
                            }}
                          >
                            {tk}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View>
                    <AppText style={fieldLabel(c)}>
                      {t("wallet.withdraw.fields.network")}
                    </AppText>
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
                    <AppText style={fieldLabel(c)}>
                      {t("wallet.withdraw.fields.walletAddress")}
                    </AppText>
                    <TextInput
                      value={form.cryptoAddress ?? ""}
                      onChangeText={(v) => setF("cryptoAddress", v)}
                      placeholder={t("wallet.withdraw.fields.walletAddressPh")}
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
                      {t("wallet.withdraw.cryptoWarning")}
                    </AppText>
                  </View>
                </View>
              ) : null}

              {/* Amount */}
              <View>
                <AppText
                  style={labelStyle(c)}
                >{`${t("wallet.withdraw.amountLabel")} (${currency})`}</AppText>
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
                        {f === 1 ? t("wallet.withdraw.max") : `${f * 100}%`}
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
                            {t("wallet.withdraw.netPreviewPrefix")}{" "}
                            <AppText
                              style={{ fontWeight: "700", color: c.green }}
                            >
                              {formatCurrency(netAmount, currency)}
                            </AppText>{" "}
                            {t("wallet.withdraw.netPreviewSuffix", {
                              percent: feePercent,
                            })}
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
                  {t("wallet.withdraw.infoNote", {
                    feePercent: getWalletWithdrawalFee(1, currency).feePercent,
                    currency,
                  })}
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
                      weight="displayBlack"
                      style={{
                        fontSize: 13,
                        letterSpacing: -0.5,
                        color: "#000",
                      }}
                    >
                      {t("wallet.withdraw.reviewBtn")}
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
  const { t } = useTranslation();
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
              {t("wallet.message.gotIt")}
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
  const { t } = useTranslation();
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
                t("wallet.depositConfirmed.title"),
                t("wallet.depositConfirmed.body", {
                  amount: formatCurrency(
                    res.data.data.amount,
                    res.data.data.currency,
                  ),
                }),
                "success",
              );
              await AsyncStorage.removeItem(PENDING_REF_KEY);
            } else if (status === "FAILED") {
              showMessage(
                t("wallet.depositFailed.title"),
                t("wallet.depositFailed.body"),
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
          t("wallet.depositInitiated.title"),
          t("wallet.depositInitiated.body"),
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
          t("wallet.cannotOpenBrowser.title"),
          t("wallet.cannotOpenBrowser.body", { link: paymentLink }),
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
              t("wallet.depositConfirmed.title"),
              t("wallet.depositConfirmed.body", {
                amount: formatCurrency(amount, currency),
              }),
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
                  t("wallet.depositConfirmed.title"),
                  t("wallet.depositConfirmed.body", {
                    amount: formatCurrency(amount, currency),
                  }),
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
              t("wallet.verificationPending.title"),
              t("wallet.verificationPending.body", { reference }),
              "info",
            );
          }
        } catch {}
      }, 5000);
    } catch (err) {
      showMessage(
        t("wallet.depositFailed.title"),
        err.response?.data?.message || t("wallet.depositFailed.body"),
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
        t("wallet.withdrawalSubmitted.title"),
        t("wallet.withdrawalSubmitted.body", {
          amount: formatCurrency(data.amount, data.currency),
          fee: formatCurrency(fee, data.currency),
          netAmount: formatCurrency(netAmount, data.currency),
          reference: res.data.data.reference,
        }),
        "success",
      );
      setShowWithdrawModal(false);
      await fetchWallet(false);
    } catch (err) {
      const status = err.response?.status;
      const msg =
        err.response?.data?.message || t("wallet.withdrawFailed.body");
      if (status === 401 || status === 403 || status === 429) {
        showMessage(t("wallet.pinFailed.title"), msg, "error");
      } else {
        showMessage(t("wallet.withdrawFailed.title"), msg, "error");
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
      getTransactionLabel(tx.type, t).toLowerCase().includes(q)
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
                weight="displayBlack"
                style={{
                  fontSize: 15,
                  letterSpacing: -0.5,
                }}
              >
                {t("wallet.title")}
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
              {t("wallet.subtitle")}
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
                {t("wallet.availableBalance", { currency: activeCurrency })}
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
                    {t("wallet.empty")}
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
                weight="displayBlack"
                style={{
                  fontSize: 15,
                  letterSpacing: -0.5,
                  color: c.orange,
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
                {t("wallet.actions.addMoney")}
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
                {t("wallet.actions.withdraw")}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <View style={{ width: "48.5%", minWidth: 0 }}>
            <StatCard
              Icon={FaArrowDown}
              label={t("wallet.stats.totalDeposits")}
              value={formatCurrency(wallet?.totalDeposited || 0, "NGN")}
              accent="green"
              c={c}
            />
          </View>
          <View style={{ width: "48.5%", minWidth: 0 }}>
            <StatCard
              Icon={FaCreditCard}
              label={t("wallet.stats.totalSpent")}
              value={formatCurrency(wallet?.totalSpent || 0, "NGN")}
              accent="orange"
              c={c}
            />
          </View>
          <View style={{ width: "48.5%", minWidth: 0 }}>
            <StatCard
              Icon={FaArrowUp}
              label={t("wallet.stats.totalWithdrawn")}
              value={formatCurrency(wallet?.totalWithdrawn || 0, "NGN")}
              c={c}
            />
          </View>
          <View style={{ width: "48.5%", minWidth: 0 }}>
            <StatCard
              Icon={FaClock}
              label={t("wallet.stats.transactions")}
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
              weight="displayBlack"
              style={{
                fontSize: 13,
                letterSpacing: -0.5,
              }}
            >
              {activeCurrency
                ? t("wallet.txHistory.titleWithCurrency", {
                    currency: activeCurrency,
                  })
                : t("wallet.txHistory.title")}
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
                placeholder={t("wallet.txHistory.searchPlaceholder")}
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
                  {filterType || t("wallet.txHistory.allTypes")}
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
                  {filterStatus || t("wallet.txHistory.allStatuses")}
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
                {t("wallet.txHistory.emptyTitle")}
              </AppText>
              <AppText
                style={{
                  fontSize: 12,
                  color: c.textMuted,
                  textAlign: "center",
                }}
              >
                {t("wallet.txHistory.emptySubtitle", {
                  currency: activeCurrency,
                })}
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
                  {t("wallet.pagination.prev")}
                </AppText>
              </Pressable>
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                {t("wallet.pagination.pageOf", {
                  page: pagination.page,
                  pages: pagination.pages,
                })}
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
                  {t("wallet.pagination.next")}
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
        title={t("wallet.txHistory.filterByType")}
        options={[
          { value: "", label: t("wallet.txHistory.allTypes") },
          { value: "DEPOSIT", label: t("wallet.txTypes.depositPlural") },
          { value: "WITHDRAWAL", label: t("wallet.txTypes.withdrawalPlural") },
          { value: "PAYMENT", label: t("wallet.txTypes.paymentPlural") },
          {
            value: "SUBSCRIPTION",
            label: t("wallet.txTypes.subscriptionPlural"),
          },
          { value: "REFUND", label: t("wallet.txTypes.refundPlural") },
        ]}
        value={filterType}
        onSelect={setFilterType}
        c={c}
      />

      <SelectModal
        open={statusFilterOpen}
        onClose={() => setStatusFilterOpen(false)}
        title={t("wallet.txHistory.filterByStatus")}
        options={[
          { value: "", label: t("wallet.txHistory.allStatuses") },
          { value: "PENDING", label: t("wallet.status.pending") },
          { value: "COMPLETED", label: t("wallet.status.completed") },
          { value: "FAILED", label: t("wallet.status.failed") },
          { value: "REVERSED", label: t("wallet.status.reversed") },
        ]}
        value={filterStatus}
        onSelect={setFilterStatus}
        c={c}
      />
    </SafeAreaView>
  );
}
