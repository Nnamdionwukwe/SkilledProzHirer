// src/components/booking/PaymentOptions.js
//
// Real RN port of components/payment/PaymentOptions.jsx.
//
// Flow:
//   1. Pricing summary — agreed total (or rate × qty), platform fee,
//      referral deduction, "You Pay" total
//   2. Card option → navigates to the InitiatePayment screen
//   3. Crypto token picker — USDC / USDT / BTC / ETH
//   4. "Pay with {token}" → POST /payments/crypto/:id (opens wallet step)
//   5. Wallet details — asset, network, wallet, amount, memo
//   6. Tx hash input + optional amount + optional receipt upload
//   7. "Confirm Transaction" → PATCH /payments/crypto/:id/confirm
//   8. On success → onSuccess callback fires; parent refetches booking
//
// i18n: every visible string uses t() under `payment.options.*`.

import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import { calcPricing, getHirerFeeRate } from "../../utils/pricing";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaPaperclip,
  FaTimes,
  FaGift,
  FaMoneyBillWave,
  FaBitcoin,
  FaCreditCard,
} from "../../icons/fa";

// ── Optional expo-clipboard / expo-image-picker — guarded ─────────────
let Clipboard = null;
let ImagePicker = null;
try {
  Clipboard = require("expo-clipboard");
} catch {}
try {
  ImagePicker = require("expo-image-picker");
} catch {}

// ── Helpers ────────────────────────────────────────────────────────────
function fmtMoney(amount, currency = "NGN") {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const CRYPTO_TOKENS = [
  { id: "USDC", label: "USDC", networkKey: "ethereum", icon: "$" },
  { id: "USDT", label: "USDT", networkKey: "tron", icon: "₮" },
  { id: "BTC", label: "Bitcoin", networkKey: "bitcoin", icon: "₿" },
  { id: "ETH", label: "Ethereum", networkKey: "ethereum", icon: "Ξ" },
];

export default function PaymentOptions({
  booking,
  bookingId: bookingIdProp,
  onSuccess,
  referralAmount = 0,
  referralApplied = false,
  onReferralToggle,
}) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("select"); // "select" | "details"

  const [cryptoAsset, setCryptoAsset] = useState("USDC");
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoDetails, setCryptoDetails] = useState(null);
  const [cryptoReceiptFile, setCryptoReceiptFile] = useState(null);

  // ── Pricing ─────────────────────────────────────────────────────────
  const p = calcPricing(booking);
  const isJobPost = booking?.source === "JOB_POST";

  const agreedTotal = isJobPost
    ? Number(booking?.agreedRate) || 0
    : Number(p.subtotal) || 0;
  const currency = booking?.currency || p.currency || "NGN";

  const PLATFORM_FEE_RATE = getHirerFeeRate(currency);
  const PLATFORM_FEE_PCT = Math.round(PLATFORM_FEE_RATE * 100);
  const platformFee = isJobPost
    ? Math.round(agreedTotal * PLATFORM_FEE_RATE * 100) / 100
    : Number(p.hirerFee) || 0;

  const referralDeduct =
    referralApplied && referralAmount > 0 ? Number(referralAmount) : 0;

  const finalTotal = isJobPost
    ? Math.max(0, agreedTotal + platformFee - referralDeduct)
    : Math.max(0, p.grossTotal - referralDeduct);

  const durationText =
    isJobPost && booking?.estimatedValue
      ? `${booking.estimatedValue} ${booking.estimatedUnit || "hours"}`
      : null;

  // ── File size guard ────────────────────────────────────────────────
  const validateFileSize = (file) => {
    if (!file) return true;
    if (file.size && file.size > MAX_FILE_SIZE) {
      setError(
        t("payment.options.errors.fileTooLarge", {
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(1),
        }),
      );
      return false;
    }
    setError("");
    return true;
  };

  // ── Receipt picker ─────────────────────────────────────────────────
  const pickReceipt = async () => {
    if (!ImagePicker) {
      toast.info(t("payment.options.errors.imagePickerUnavailable"));
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error(t("payment.options.errors.mediaPermission"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setCryptoReceiptFile({
        uri: asset.uri,
        name: asset.fileName || `receipt_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      });
    } catch {
      toast.error(t("payment.options.errors.imagePickerFailed"));
    }
  };

  // ── Copy to clipboard ──────────────────────────────────────────────
  const copyToClipboard = async (text) => {
    if (!Clipboard) {
      toast.info(t("payment.options.errors.clipboardUnavailable"));
      return;
    }
    try {
      await Clipboard.setStringAsync(String(text));
      toast.success(t("payment.options.toast.copied"));
    } catch {
      toast.error(t("payment.options.errors.copyFailed"));
    }
  };

  // ── Pay by card → navigate to InitiatePayment ──────────────────────
  const handleCardPay = () => {
    const resolvedBookingId =
      booking?.id || booking?.bookingId || bookingIdProp;
    console.log("💳 CARD TAP → resolvedBookingId:", resolvedBookingId);
    console.log("💳 booking:", booking);
    if (!resolvedBookingId) {
      console.log("💳 ABORT: no booking id available");
      toast.error(t("payment.options.errors.missingBookingId"));
      return;
    }
    try {
      navigation.navigate("InitiatePayment", {
        bookingId: resolvedBookingId,
      });
      console.log("💳 navigate() returned OK for", resolvedBookingId);
    } catch (err) {
      console.log("💳 navigate() threw:", err?.message);
      toast.error(err?.message || t("payment.options.errors.navFailed"));
    }
  };

  // ── Initiate crypto ────────────────────────────────────────────────
  async function handleCryptoInitiate() {
    setLoading(true);
    setError("");
    try {
      const res = await client.post(`/payments/crypto/${booking.id}`, {
        cryptoCurrency: cryptoAsset,
      });
      const details =
        res.data?.data?.cryptoDetails ||
        res.data?.cryptoDetails ||
        res.data?.data ||
        null;
      setCryptoDetails(details);
      setStep("details");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t("payment.options.errors.cryptoInitiateFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Confirm crypto ─────────────────────────────────────────────────
  async function handleCryptoConfirm() {
    if (!cryptoTxHash.trim()) {
      setError(t("payment.options.errors.txHashRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("txHash", cryptoTxHash.trim());
      form.append("cryptoCurrency", cryptoAsset);
      if (cryptoAmount) form.append("cryptoAmount", cryptoAmount);
      if (referralApplied && referralAmount > 0) {
        form.append("referralAmount", String(referralAmount));
      }
      if (cryptoReceiptFile) {
        form.append("proof", {
          uri: cryptoReceiptFile.uri,
          name: cryptoReceiptFile.name,
          type: cryptoReceiptFile.type,
        });
      }

      await client.patch(`/payments/crypto/${booking.id}/confirm`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onSuccess?.();
      toast.success(t("payment.options.toast.cryptoSubmitted"));
    } catch (e) {
      setError(
        e?.response?.data?.message || t("payment.options.errors.confirmFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <View style={{ gap: 12 }}>
      {/* ── PRICING BREAKDOWN ──────────────────────────────────────── */}
      <View
        style={[
          styles.summary,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <FaMoneyBillWave size={13} color={c.text} />
          <AppText
            style={{
              fontFamily: "Syne_700Bold",
              fontSize: 13,
              fontWeight: "800",
              color: c.text,
              flex: 1,
            }}
          >
            {t("payment.options.breakdown.title")}
          </AppText>
          {isJobPost ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: "rgba(129,140,248,0.12)",
              }}
            >
              <AppText
                style={{ fontSize: 9, fontWeight: "700", color: "#818cf8" }}
              >
                {t("payment.options.breakdown.fromJobPost")}
              </AppText>
            </View>
          ) : null}
        </View>

        <FeeLine
          label={
            isJobPost
              ? t("payment.options.labels.agreedTotal")
              : t("payment.options.labels.agreedRate")
          }
          value={`${fmtMoney(agreedTotal, currency)}${!isJobPost ? p.unitSuffix || "" : ""}`}
        />

        {isJobPost && durationText ? (
          <FeeLine
            label={t("payment.options.labels.duration")}
            value={
              <AppText style={{ fontSize: 13, color: c.text }}>
                {durationText}
                {booking.estimatedHours ? (
                  <AppText style={{ color: c.textMuted, fontSize: 11 }}>
                    {" "}
                    {t("payment.options.labels.approxHours", {
                      hours: booking.estimatedHours,
                    })}
                  </AppText>
                ) : null}
              </AppText>
            }
          />
        ) : null}
        {!isJobPost && p.hasQty ? (
          <FeeLine
            label={t("payment.options.labels.duration")}
            value={`${p.qty} ${p.unitLabel}${p.qty !== 1 ? "s" : ""}`}
          />
        ) : null}
        {!isJobPost && p.hasQty ? (
          <FeeLine
            label={t("payment.options.labels.subtotalLine", {
              qty: p.qty,
              rate: fmtMoney(p.agreedRate, currency),
            })}
            value={fmtMoney(p.subtotal, currency)}
          />
        ) : null}

        <FeeLine
          label={t("payment.options.labels.platformFee", {
            percent: PLATFORM_FEE_PCT,
          })}
          value={`+ ${fmtMoney(platformFee, currency)}`}
          muted
        />

        {referralDeduct > 0 ? (
          <View style={styles.row}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <FaGift size={11} color={c.green} />
              <AppText style={{ fontSize: 12, color: c.green }}>
                {t("payment.options.labels.referralBonus")}
              </AppText>
            </View>
            <AppText
              style={{ fontSize: 12, color: c.green, fontWeight: "600" }}
            >
              − {fmtMoney(referralDeduct, currency)}
            </AppText>
          </View>
        ) : null}

        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }}
        />
        <View style={styles.row}>
          <AppText style={{ fontSize: 14, fontWeight: "700", color: c.text }}>
            {t("payment.options.labels.youPay")}
          </AppText>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: c.orange,
            }}
          >
            {fmtMoney(finalTotal, currency)}
          </AppText>
        </View>
      </View>

      {/* ── STEP 1: METHOD SELECTION ──────────────────────────────── */}
      {step === "select" ? (
        <View style={{ gap: 12 }}>
          <AppText style={{ fontSize: 12, color: c.textDim, lineHeight: 18 }}>
            {t("payment.options.select.intro")}
          </AppText>

          {/* Card option — opens the InitiatePayment screen */}
          <Pressable
            onPress={handleCardPay}
            style={({ pressed }) => [
              styles.cardBtn,
              {
                borderColor: c.border,
                backgroundColor: c.bgCard,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaCreditCard size={20} color={c.orange} />
            <View style={{ flex: 1 }}>
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: c.text }}
              >
                {t("payment.options.card.title")}
              </AppText>
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                {t("payment.options.card.desc")}
              </AppText>
            </View>
          </Pressable>

          {/* Crypto section header */}
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: c.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              marginTop: 4,
            }}
          >
            {t("payment.options.crypto.sectionTitle")}
          </AppText>

          {/* Token grid */}
          <View style={styles.tokenGrid}>
            {CRYPTO_TOKENS.map((tok) => {
              const active = cryptoAsset === tok.id;
              return (
                <Pressable
                  key={tok.id}
                  onPress={() => setCryptoAsset(tok.id)}
                  style={({ pressed }) => [
                    styles.tokenCard,
                    {
                      borderColor: active ? c.orange : c.border,
                      backgroundColor: active ? c.orangeDim : c.bgCard,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 20,
                      color: active ? c.orange : c.textMuted,
                      fontWeight: "700",
                    }}
                  >
                    {tok.icon}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: active ? c.orange : c.text,
                      marginTop: 4,
                    }}
                  >
                    {tok.label}
                  </AppText>
                  <AppText style={{ fontSize: 10, color: c.textMuted }}>
                    {t(`payment.options.networks.${tok.networkKey}`)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleCryptoInitiate}
            disabled={loading}
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: loading ? c.bgCard : c.orange,
                opacity: loading ? 0.7 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <FaBitcoin size={14} color="#fff" />
                <AppText
                  style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}
                >
                  {t("payment.options.actions.payWithToken", {
                    token: cryptoAsset,
                  })}
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
      ) : null}

      {/* ── STEP 2: WALLET DETAILS + CONFIRM ──────────────────────── */}
      {step === "details" && cryptoDetails ? (
        <View style={{ gap: 10 }}>
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
            {t("payment.options.details.sendToWallet")}
          </AppText>

          <View
            style={[
              styles.bankCard,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <BankRow
              label={t("payment.options.details.asset")}
              value={cryptoDetails.currency || cryptoAsset}
            />
            <BankRow
              label={t("payment.options.details.network")}
              value={cryptoDetails.network || "—"}
            />
            <BankRow
              label={t("payment.options.details.wallet")}
              value={cryptoDetails.wallet || "—"}
              mono
              copyable
              onCopy={copyToClipboard}
            />
            <BankRow
              label={t("payment.options.details.amount")}
              value={fmtMoney(finalTotal, currency)}
              accent
            />
            {cryptoDetails.note ? (
              <BankRow
                label={t("payment.options.details.memo")}
                value={cryptoDetails.note}
                mono
                copyable
                onCopy={copyToClipboard}
              />
            ) : null}
          </View>

          <View
            style={[
              styles.warnBox,
              {
                backgroundColor: c.redDim,
                borderColor: "rgba(239,68,68,0.2)",
              },
            ]}
          >
            <FaExclamationTriangle
              size={11}
              color={c.red}
              style={{ marginTop: 2 }}
            />
            <AppText
              style={{
                fontSize: 12,
                color: c.red,
                flex: 1,
                marginLeft: 6,
                lineHeight: 18,
              }}
            >
              {t("payment.options.details.networkWarning", {
                token: cryptoDetails.currency || cryptoAsset,
                network: cryptoDetails.network || "—",
              })}
            </AppText>
          </View>

          <AppText style={[styles.label, { color: c.textDim }]}>
            {t("payment.options.details.fields.txHash")}
          </AppText>
          <TextInput
            value={cryptoTxHash}
            onChangeText={setCryptoTxHash}
            placeholder={t("payment.options.details.placeholders.txHash")}
            placeholderTextColor={c.textMuted}
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: c.border,
                backgroundColor: c.bgInput,
                fontFamily: "DMSans_400Regular",
              },
            ]}
          />

          <AppText style={[styles.label, { color: c.textDim }]}>
            {t("payment.options.details.fields.amountOptional")}
          </AppText>
          <TextInput
            value={cryptoAmount}
            onChangeText={(v) => setCryptoAmount(v.replace(/[^0-9.]/g, ""))}
            keyboardType="decimal-pad"
            placeholder={t("payment.options.details.placeholders.amount", {
              token: cryptoAsset,
            })}
            placeholderTextColor={c.textMuted}
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: c.border,
                backgroundColor: c.bgInput,
              },
            ]}
          />

          <AppText style={[styles.label, { color: c.textDim }]}>
            {t("payment.options.details.fields.receipt")}
          </AppText>
          <Pressable
            onPress={pickReceipt}
            style={({ pressed }) => [
              styles.uploadBtn,
              {
                borderColor: c.border,
                backgroundColor: c.bgCard,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaPaperclip size={12} color={c.textDim} />
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: c.textDim,
                marginLeft: 6,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {cryptoReceiptFile
                ? cryptoReceiptFile.name
                : t("payment.options.details.placeholders.receipt")}
            </AppText>
          </Pressable>
          {cryptoReceiptFile ? (
            <Pressable
              onPress={() => setCryptoReceiptFile(null)}
              style={{ alignSelf: "flex-start" }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <FaTimes size={10} color={c.red} />
                <AppText style={{ fontSize: 11, color: c.red }}>
                  {t("payment.options.details.removeReceipt")}
                </AppText>
              </View>
            </Pressable>
          ) : null}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <Pressable
              onPress={() => setStep("select")}
              disabled={loading}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  borderColor: c.border,
                  opacity: loading ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
              >
                {t("payment.options.actions.back")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={handleCryptoConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.payBtn,
                {
                  flex: 1,
                  backgroundColor: loading ? c.bgCard : c.orange,
                  opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <FaCheckCircle size={12} color="#fff" />
                  <AppText
                    style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
                  >
                    {t("payment.options.actions.confirmTransaction")}
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
          ]}
        >
          <FaExclamationTriangle size={11} color={c.red} />
          <AppText
            style={{ fontSize: 12, color: c.red, marginLeft: 6, flex: 1 }}
          >
            {error}
          </AppText>
        </View>
      ) : null}

      <AppText
        style={{
          fontSize: 11,
          color: c.textMuted,
          textAlign: "center",
          lineHeight: 15,
        }}
      >
        {t("payment.options.disclaimer")}
      </AppText>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────
function FeeLine({ label, value, muted }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.row}>
      <AppText
        style={{
          fontSize: 13,
          color: muted ? c.textMuted : c.textDim,
          flex: 1,
        }}
      >
        {label}
      </AppText>
      {typeof value === "string" ? (
        <AppText
          style={{
            fontSize: 13,
            color: muted ? c.textMuted : c.text,
            textAlign: "right",
          }}
        >
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}

function BankRow({ label, value, mono, copyable, accent, onCopy }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.bankRow, { borderBottomColor: c.border }]}>
      <AppText style={{ fontSize: 11, color: c.textMuted, flexShrink: 0 }}>
        {label}
      </AppText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        <AppText
          style={{
            fontSize: accent ? 14 : 13,
            fontWeight: accent ? "700" : "600",
            color: accent ? c.orange : c.text,
            fontFamily: mono ? "monospace" : undefined,
            textAlign: "right",
            flexShrink: 1,
          }}
          numberOfLines={2}
        >
          {value}
        </AppText>
        {copyable ? (
          <Pressable onPress={() => onCopy?.(value)} hitSlop={8}>
            <AppText style={{ fontSize: 12, color: c.textDim }}>⎘</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 2,
  },
  tokenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tokenCard: {
    width: "48%",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  cardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  payBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bankCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
});
