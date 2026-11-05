// src/components/booking/PaymentOptions.js

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
import CryptoRateConverter from "./CryptoRateConverter";
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
function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function PaymentOptions({
  booking,
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
  const [convertedCryptoAmount, setConvertedCryptoAmount] = useState(null);

  // ── Pricing ─────────────────────────────────────────────────────────
  const p = calcPricing(booking, referralAmount, referralApplied);
  const isJobPost = booking?.source === "JOB_POST";

  const agreedTotal = isJobPost
    ? Number(booking?.agreedRate || 0)
    : Number(p.subtotal || p.rate || 0);
  const currency = booking?.currency || p.currency || "NGN";

  const PLATFORM_FEE_RATE = getHirerFeeRate(currency);
  const PLATFORM_FEE_PCT = Math.round(PLATFORM_FEE_RATE * 100);

  const platformFee = isJobPost
    ? Math.round(agreedTotal * PLATFORM_FEE_RATE * 100) / 100
    : Number(p.hirerFee || 0);

  const referralDeduct =
    referralApplied && referralAmount > 0 ? Number(referralAmount) : 0;

  const finalTotal = isJobPost
    ? Math.max(0, agreedTotal + platformFee - referralDeduct)
    : Number(p.totalCharged || 0);

  const durationText =
    isJobPost && booking?.estimatedValue
      ? `${booking.estimatedValue} ${booking.estimatedUnit || "hours"}`
      : null;

  const validateFileSize = (file) => {
    if (!file) return true;
    if (file.size && file.size > MAX_FILE_SIZE) {
      setError(
        t("payment.options.errors.fileTooLarge", {
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(1),
          defaultValue: "File is too large. Maximum size is 5MB.",
        }),
      );
      return false;
    }
    setError("");
    return true;
  };

  const pickReceipt = async () => {
    if (!ImagePicker) {
      toast.info(
        t(
          "payment.options.errors.imagePickerUnavailable",
          "Image picker unavailable",
        ),
      );
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error(
          t("payment.options.errors.mediaPermission", "Permission required"),
        );
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
      toast.error(
        t("payment.options.errors.imagePickerFailed", "Could not open gallery"),
      );
    }
  };

  const copyToClipboard = async (text) => {
    if (!Clipboard) {
      toast.info(
        t(
          "payment.options.errors.clipboardUnavailable",
          "Clipboard unavailable",
        ),
      );
      return;
    }
    try {
      await Clipboard.setStringAsync(String(text));
      toast.success(t("payment.options.toast.copied", "Copied!"));
    } catch {
      toast.error(t("payment.options.errors.copyFailed", "Copy failed"));
    }
  };

  const handleCardPay = () => {
    const resolvedBookingId = booking?.id || booking?.bookingId;
    if (!resolvedBookingId) {
      toast.error(
        t("payment.options.errors.missingBookingId", "Booking ID missing"),
      );
      return;
    }
    try {
      navigation.navigate("InitiatePayment", { bookingId: resolvedBookingId });
    } catch (err) {
      toast.error(
        err?.message ||
          t("payment.options.errors.navFailed", "Navigation failed"),
      );
    }
  };

  async function handleCryptoInitiate() {
    setLoading(true);
    setError("");
    try {
      const res = await client.post(`/payments/crypto/${booking.id}`, {
        cryptoCurrency: cryptoAsset,
      });
      setCryptoDetails(res.data?.data?.cryptoDetails || res.data?.data);
      setStep("details");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t(
            "payment.options.errors.cryptoInitiateFailed",
            "Failed to initiate crypto payment",
          ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCryptoConfirm() {
    if (!cryptoTxHash.trim()) {
      setError(
        t(
          "payment.options.errors.txHashRequired",
          "Transaction hash is required",
        ),
      );
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
      toast.success(
        t("payment.options.toast.cryptoSubmitted", "Crypto payment submitted"),
      );
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t("payment.options.errors.confirmFailed", "Confirmation failed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrap}>
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
              fontFamily: "Syne_800ExtraBold",
              fontSize: 13,
              color: c.text,
              flex: 1,
            }}
          >
            {t("payment.options.breakdown.title", "Payment Breakdown")}
          </AppText>
          {isJobPost && (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: "rgba(129,140,248,0.12)",
              }}
            >
              <AppText
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  color: "#818cf8",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {t("payment.options.breakdown.fromJobPost", "From Job Post")}
              </AppText>
            </View>
          )}
        </View>

        <FeeLine
          label={
            isJobPost
              ? t("payment.options.labels.agreedTotal", "Agreed Total")
              : t("payment.options.labels.agreedRate", "Agreed Rate")
          }
          value={`${formatPrice(agreedTotal, currency)}${!isJobPost ? p.unitSuffix || "" : ""}`}
          c={c}
        />

        {isJobPost && durationText && (
          <FeeLine
            label={t("payment.options.labels.duration", "Duration")}
            value={
              <AppText
                style={{
                  fontSize: 12,
                  color: c.text,
                  fontFamily: "DMSans_700Bold",
                }}
              >
                {durationText}
                {booking.estimatedHours && (
                  <AppText style={{ color: c.textMuted, fontSize: 11 }}>
                    {" "}
                    {t("payment.options.labels.approxHours", {
                      hours: booking.estimatedHours,
                      defaultValue: "(≈ {{hours}}h)",
                    })}
                  </AppText>
                )}
              </AppText>
            }
            c={c}
          />
        )}

        {!isJobPost && p.hasQty && (
          <>
            <FeeLine
              label={t("payment.options.labels.duration", "Duration")}
              value={`${p.qty} ${p.unitLabel}${p.qty !== 1 ? "s" : ""}`}
              c={c}
            />
            <FeeLine
              label={t("payment.options.labels.subtotalLine", {
                qty: p.qty,
                rate: formatPrice(p.rate, currency),
                defaultValue: "Subtotal ({{qty}} × {{rate}})",
              })}
              value={formatPrice(p.subtotal, currency)}
              c={c}
            />
          </>
        )}

        <FeeLine
          label={t("payment.options.labels.platformFee", {
            percent: PLATFORM_FEE_PCT,
            defaultValue: "Platform Fee ({{percent}}%)",
          })}
          value={`+ ${formatPrice(platformFee, currency)}`}
          muted
          c={c}
        />

        {referralDeduct > 0 && (
          <View style={styles.row}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <FaGift size={11} color={c.green} />
              <AppText
                style={{
                  fontSize: 12,
                  color: c.green,
                  fontFamily: "DMSans_400Regular",
                }}
              >
                {t("payment.options.labels.referralBonus", "Referral bonus")}
              </AppText>
            </View>
            <AppText
              style={{
                fontSize: 12,
                color: c.green,
                fontFamily: "DMSans_700Bold",
              }}
            >
              − {formatPrice(referralDeduct, currency)}
            </AppText>
          </View>
        )}

        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }}
        />

        <View style={styles.row}>
          <AppText
            style={{
              fontSize: 13,
              fontFamily: "DMSans_700Bold",
              color: c.text,
            }}
          >
            {t("payment.options.labels.youPay", "You Pay")}
          </AppText>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 17,
              color: c.orange,
            }}
          >
            {formatPrice(finalTotal, currency)}
          </AppText>
        </View>
      </View>

      {/* ── STEP 1: METHOD SELECTION ──────────────────────────────── */}
      {step === "select" && (
        <View style={{ gap: 12 }}>
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              fontFamily: "DMSans_400Regular",
              lineHeight: 18,
            }}
          >
            {t(
              "payment.options.select.intro",
              "Pay with cryptocurrency. Send to our wallet and submit your transaction hash.",
            )}
          </AppText>

          {/* CryptoRateConverter — same as web */}
          <CryptoRateConverter
            fiatAmount={finalTotal}
            fiatCurrency={currency}
            selectedToken={cryptoAsset}
            onAmountChange={(data) => {
              setCryptoAsset(data.token);
              setConvertedCryptoAmount(data.amount);
            }}
          />

          <Pressable
            onPress={handleCryptoInitiate}
            disabled={loading}
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: loading ? c.bgCard : c.orange,
                opacity: loading ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {loading ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ActivityIndicator color="#fff" size="small" />
                <AppText
                  style={{
                    fontSize: 14,
                    fontFamily: "Syne_800ExtraBold",
                    color: "#fff",
                  }}
                >
                  {t("payment.options.actions.loading", "Loading wallet…")}
                </AppText>
              </View>
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <FaBitcoin size={14} color="#fff" />
                <AppText
                  style={{
                    fontSize: 14,
                    fontFamily: "Syne_800ExtraBold",
                    color: "#fff",
                  }}
                >
                  {t("payment.options.actions.payWithToken", {
                    token: cryptoAsset,
                    defaultValue: "Pay with {{token}}",
                  })}
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* ── STEP 2: WALLET DETAILS + CONFIRM ──────────────────────── */}
      {step === "details" && cryptoDetails && (
        <View style={{ gap: 12 }}>
          <AppText
            style={{ fontSize: 13, fontFamily: "Syne_700Bold", color: c.text }}
          >
            {t("payment.options.details.sendToWallet", "Send to this wallet")}
          </AppText>

          <View
            style={[
              styles.bankCard,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <BankRow
              label={t("payment.options.details.asset", "Asset")}
              value={cryptoDetails.currency || cryptoAsset}
              c={c}
            />
            <BankRow
              label={t("payment.options.details.network", "Network")}
              value={cryptoDetails.network || "—"}
              c={c}
            />
            <BankRow
              label={t("payment.options.details.wallet", "Wallet")}
              value={cryptoDetails.wallet || "—"}
              mono
              copyable
              onCopy={copyToClipboard}
              c={c}
            />
            <BankRow
              label={t("payment.options.details.amount", "Amount")}
              value={
                convertedCryptoAmount
                  ? `${convertedCryptoAmount.toFixed(6)} ${cryptoAsset}`
                  : formatPrice(finalTotal, currency)
              }
              accent
              c={c}
            />
            {cryptoDetails.note && (
              <BankRow
                label={t("payment.options.details.memo", "Memo")}
                value={cryptoDetails.note}
                mono
                copyable
                onCopy={copyToClipboard}
                c={c}
              />
            )}
          </View>

          <View
            style={[
              styles.bankWarn,
              { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
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
                lineHeight: 17,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {t("payment.options.details.networkWarning", {
                token: cryptoDetails.currency || cryptoAsset,
                network: cryptoDetails.network || "—",
                defaultValue:
                  "Only send {{token}} on the {{network}} network. Wrong network may result in permanent loss of funds.",
              })}
            </AppText>
          </View>

          <AppText style={styles.label}>
            {t(
              "payment.options.details.fields.txHash",
              "Transaction Hash / TX ID *",
            )}
          </AppText>
          <TextInput
            value={cryptoTxHash}
            onChangeText={setCryptoTxHash}
            placeholder={t(
              "payment.options.details.placeholders.txHash",
              "0x... or transaction ID",
            )}
            placeholderTextColor={c.textMuted}
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: c.border,
                backgroundColor: c.bgInput,
                fontFamily: "monospace",
              },
            ]}
          />

          <AppText style={styles.label}>
            {t(
              "payment.options.details.fields.amountOptional",
              "Amount Sent (optional)",
            )}
          </AppText>
          <TextInput
            value={cryptoAmount}
            onChangeText={(v) => setCryptoAmount(v.replace(/[^0-9.]/g, ""))}
            keyboardType="decimal-pad"
            placeholder={t("payment.options.details.placeholders.amount", {
              token: cryptoAsset,
              defaultValue: "Amount in {{token}}",
            })}
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

          <AppText style={styles.label}>
            {t(
              "payment.options.details.fields.receipt",
              "Transaction Screenshot (optional)",
            )}
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
                color: c.textDim,
                fontFamily: "DMSans_700Bold",
                marginLeft: 6,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {cryptoReceiptFile
                ? cryptoReceiptFile.name
                : t(
                    "payment.options.details.placeholders.receipt",
                    "Upload screenshot",
                  )}
            </AppText>
          </Pressable>
          {cryptoReceiptFile && (
            <Pressable
              onPress={() => setCryptoReceiptFile(null)}
              style={{ alignSelf: "flex-start" }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <FaTimes size={10} color={c.red} />
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.red,
                    fontFamily: "DMSans_400Regular",
                  }}
                >
                  {t("payment.options.details.removeReceipt", "Remove receipt")}
                </AppText>
              </View>
            </Pressable>
          )}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <Pressable
              onPress={() => setStep("select")}
              disabled={loading}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  borderColor: c.border,
                  opacity: loading ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 13,
                  fontFamily: "DMSans_700Bold",
                  color: c.textDim,
                }}
              >
                {t("payment.options.actions.back", "← Back")}
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
                  opacity: loading ? 0.5 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {loading ? (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <ActivityIndicator color="#fff" size="small" />
                  <AppText
                    style={{
                      fontSize: 14,
                      fontFamily: "Syne_800ExtraBold",
                      color: "#fff",
                    }}
                  >
                    {t("payment.options.actions.submitting", "Submitting…")}
                  </AppText>
                </View>
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <FaCheckCircle size={12} color="#fff" />
                  <AppText
                    style={{
                      fontSize: 14,
                      fontFamily: "Syne_800ExtraBold",
                      color: "#fff",
                    }}
                  >
                    {t(
                      "payment.options.actions.confirmTransaction",
                      "Confirm Transaction",
                    )}
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {error && (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
          ]}
        >
          <FaExclamationTriangle size={11} color={c.red} />
          <AppText
            style={{
              fontSize: 12,
              color: c.red,
              marginLeft: 6,
              flex: 1,
              fontFamily: "DMSans_400Regular",
            }}
          >
            {error}
          </AppText>
        </View>
      )}

      <AppText
        style={{
          fontSize: 11,
          color: c.textMuted,
          textAlign: "center",
          fontFamily: "DMSans_400Regular",
          lineHeight: 15,
        }}
      >
        {t(
          "payment.options.disclaimer",
          "All payments are held in escrow and only released after you confirm job completion.",
        )}
      </AppText>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────
function FeeLine({ label, value, muted, c }) {
  return (
    <View style={styles.row}>
      <AppText
        style={{
          fontSize: 12,
          color: muted ? c.textMuted : c.textDim,
          flex: 1,
          fontFamily: "DMSans_400Regular",
        }}
      >
        {label}
      </AppText>
      {typeof value === "string" ? (
        <AppText
          style={{
            fontSize: 12,
            color: muted ? c.textMuted : c.text,
            textAlign: "right",
            fontFamily: "DMSans_700Bold",
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

function BankRow({ label, value, mono, copyable, accent, onCopy, c }) {
  return (
    <View style={[styles.bankRow, { borderBottomColor: c.border }]}>
      <AppText
        style={{
          fontSize: 11,
          color: c.textMuted,
          flexShrink: 0,
          fontFamily: "DMSans_400Regular",
        }}
      >
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
            fontFamily: mono ? "monospace" : "DMSans_700Bold",
            color: accent ? c.orange : c.text,
            textAlign: "right",
            flexShrink: 1,
          }}
          numberOfLines={2}
        >
          {value}
        </AppText>
        {copyable ? (
          <Pressable
            onPress={() => onCopy?.(value)}
            hitSlop={8}
            style={{
              padding: 4,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 4,
              backgroundColor: c.bgPanel,
            }}
          >
            <AppText style={{ fontSize: 11, color: c.textDim }}>⎘</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  summary: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bankCard: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bankWarn: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
});
