// src/components/booking/PaymentOptions.js
//
// Real RN port of components/payment/PaymentOptions.jsx.
//
// Flow:
//   1. Pricing summary — agreed total (or rate × qty), platform fee,
//      referral deduction, "You Pay" total
//   2. Crypto token picker — USDC / USDT / BTC / ETH
//   3. "Pay with {token}" → POST /payments/crypto/:id (opens wallet step)
//   4. Wallet details — asset, network, wallet, amount, memo
//   5. Tx hash input + optional amount + optional receipt upload
//   6. "Confirm Transaction" → PATCH /payments/crypto/:id/confirm
//   7. On success → onSuccess callback fires; parent refetches booking
//
// The web version used window.navigator.clipboard and window.open; the
// mobile version uses expo-clipboard (if available) and Linking.openURL.
// Both are guarded so missing deps don't crash.

import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
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
  { id: "USDC", label: "USDC", network: "Ethereum", icon: "$" },
  { id: "USDT", label: "USDT", network: "Tron (TRC20)", icon: "₮" },
  { id: "BTC", label: "Bitcoin", network: "Bitcoin", icon: "₿" },
  { id: "ETH", label: "Ethereum", network: "Ethereum", icon: "Ξ" },
];

export default function PaymentOptions({
  booking,
  onSuccess,
  referralAmount = 0,
  referralApplied = false,
  onReferralToggle,
}) {
  const { t } = useTranslation();
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

  // ── Pricing (mirror the web's manual job-post fix) ───────────────────
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

  // ── File size guard ──────────────────────────────────────────────────
  const validateFileSize = (file) => {
    if (!file) return true;
    if (file.size && file.size > MAX_FILE_SIZE) {
      setError(
        `File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 5MB.`,
      );
      return false;
    }
    setError("");
    return true;
  };

  // ── Receipt picker ───────────────────────────────────────────────────
  const pickReceipt = async () => {
    if (!ImagePicker) {
      toast.info("Receipt upload requires expo-image-picker.");
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error("Media library permission required.");
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
    } catch (e) {
      toast.error("Could not pick image.");
    }
  };

  // ── Copy to clipboard ────────────────────────────────────────────────
  const copyToClipboard = async (text) => {
    if (!Clipboard) {
      toast.info("Copy requires expo-clipboard.");
      return;
    }
    try {
      await Clipboard.setStringAsync(String(text));
      toast.success("Copied.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  // ── Initiate crypto ──────────────────────────────────────────────────
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
        e?.response?.data?.message || "Failed to initiate crypto payment",
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Confirm crypto ───────────────────────────────────────────────────
  async function handleCryptoConfirm() {
    if (!cryptoTxHash.trim()) {
      setError("Transaction hash is required");
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
      toast.success("Crypto payment submitted.");
    } catch (e) {
      setError(e?.response?.data?.message || "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
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
            Payment Breakdown
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
                FROM JOB POST
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Agreed Total / Rate */}
        <FeeLine
          label={isJobPost ? "Agreed Total" : "Agreed Rate"}
          value={`${fmtMoney(agreedTotal, currency)}${!isJobPost ? p.unitSuffix || "" : ""}`}
        />

        {/* Duration */}
        {isJobPost && durationText ? (
          <FeeLine
            label="Duration"
            value={
              <AppText style={{ fontSize: 13, color: c.text }}>
                {durationText}
                {booking.estimatedHours ? (
                  <AppText style={{ color: c.textMuted, fontSize: 11 }}>
                    {" "}
                    (≈ {booking.estimatedHours}h)
                  </AppText>
                ) : null}
              </AppText>
            }
          />
        ) : null}
        {!isJobPost && p.hasQty ? (
          <FeeLine
            label="Duration"
            value={`${p.qty} ${p.unitLabel}${p.qty !== 1 ? "s" : ""}`}
          />
        ) : null}
        {!isJobPost && p.hasQty ? (
          <FeeLine
            label={`Subtotal (${p.qty} × ${fmtMoney(p.agreedRate, currency)})`}
            value={fmtMoney(p.subtotal, currency)}
          />
        ) : null}

        {/* Platform Fee */}
        <FeeLine
          label={`Platform Fee (${PLATFORM_FEE_PCT}%)`}
          value={`+ ${fmtMoney(platformFee, currency)}`}
          muted
        />

        {/* Referral */}
        {referralDeduct > 0 ? (
          <View style={styles.row}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <FaGift size={11} color={c.green} />
              <AppText style={{ fontSize: 12, color: c.green }}>
                Referral bonus
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
            You Pay
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

      {/* ── STEP 1: TOKEN SELECT ──────────────────────────────────── */}
      {step === "select" ? (
        <View style={{ gap: 12 }}>
          <AppText style={{ fontSize: 12, color: c.textDim, lineHeight: 18 }}>
            Pay with cryptocurrency. Send to our wallet and submit your
            transaction hash.
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
                    {tok.network}
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
                  Pay with {cryptoAsset}
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
            Send to this wallet
          </AppText>

          <View
            style={[
              styles.bankCard,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <BankRow
              label="Asset"
              value={cryptoDetails.currency || cryptoAsset}
            />
            <BankRow label="Network" value={cryptoDetails.network || "—"} />
            <BankRow
              label="Wallet"
              value={cryptoDetails.wallet || "—"}
              mono
              copyable
              onCopy={copyToClipboard}
            />
            <BankRow
              label="Amount"
              value={fmtMoney(finalTotal, currency)}
              accent
            />
            {cryptoDetails.note ? (
              <BankRow
                label="Memo"
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
              Only send {cryptoDetails.currency || cryptoAsset} on the{" "}
              {cryptoDetails.network || "correct"} network. Wrong network may
              result in permanent loss of funds.
            </AppText>
          </View>

          {/* Tx hash input */}
          <AppText style={[styles.label, { color: c.textDim }]}>
            Transaction Hash / TX ID *
          </AppText>
          <TextInput
            value={cryptoTxHash}
            onChangeText={setCryptoTxHash}
            placeholder="0x... or transaction ID"
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

          {/* Amount input */}
          <AppText style={[styles.label, { color: c.textDim }]}>
            Amount Sent (optional)
          </AppText>
          <TextInput
            value={cryptoAmount}
            onChangeText={(v) => setCryptoAmount(v.replace(/[^0-9.]/g, ""))}
            keyboardType="decimal-pad"
            placeholder="Amount in crypto"
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

          {/* Receipt upload */}
          <AppText style={[styles.label, { color: c.textDim }]}>
            Transaction Screenshot (optional)
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
                ? `✅ ${cryptoReceiptFile.name}`
                : "Upload screenshot"}
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
                  Remove screenshot
                </AppText>
              </View>
            </Pressable>
          ) : null}

          {/* Back + Confirm */}
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
                ← Back
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
                    Confirm Transaction
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Error */}
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

      {/* Disclaimer */}
      <AppText
        style={{
          fontSize: 11,
          color: c.textMuted,
          textAlign: "center",
          lineHeight: 15,
        }}
      >
        All payments are held in escrow and only released after you confirm job
        completion.
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
