// src/screens/main/InitiatePaymentScreen.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";

import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import CryptoRateConverter from "../../components/booking/CryptoRateConverter";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import { calcPricing, getHirerFeeRate } from "../../utils/pricing";
import {
  FaArrowLeft,
  FaCreditCard,
  FaBitcoin,
  FaCheckCircle,
  FaExclamationTriangle,
  FaGift,
  FaLock,
  FaShieldAlt,
  FaCopy,
  FaCheck,
  FaPaperclip,
  FaUser,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaGlobe,
  FaWallet,
  FaFileAlt,
  FaClipboardList,
  FaBriefcase,
} from "../../icons/fa";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const METHODS = [
  {
    id: "card",
    labelKey: "payment.initiate.method.card.title",
    descKey: "payment.initiate.method.card.desc",
  },
  {
    id: "crypto",
    labelKey: "payment.initiate.method.crypto.title",
    descKey: "payment.initiate.method.crypto.desc",
  },
];

function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InitiatePaymentScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const bookingId = route.params?.bookingId;
  const redirectTo = route.params?.redirectTo || null;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("card");
  const [manualData, setManualData] = useState(null);
  const [selectedCryptoToken, setSelectedCryptoToken] = useState("USDC");
  const [confirmStep, setConfirmStep] = useState(null);
  const [confirmForm, setConfirmForm] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [cryptoReceiptFile, setCryptoReceiptFile] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralPercent, setReferralPercent] = useState(0);
  const [referralAmount, setReferralAmount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);
  const [convertedCryptoAmount, setConvertedCryptoAmount] = useState(null);
  const [copied, setCopied] = useState({});

  const pollRef = useRef(null);
  const awaitingBrowserReturnRef = useRef(false);

  const handleCopy = async (text, key) => {
    try {
      await Clipboard.setStringAsync(String(text));
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    } catch {
      toast.error(t("payment.initiate.errors.copyFailed", "Copy failed"));
    }
  };

  const loadBooking = useCallback(async () => {
    if (!bookingId) return null;
    try {
      const res = await client.get(`/bookings/${bookingId}`);
      const b = res.data.data.booking;
      setBooking(b);
      setBookingStatus(b.status);
      return b;
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t("payment.initiate.errors.loadBooking", "Could not load booking"),
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [bookingId, t]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    if (!booking) return;
    client
      .get("/referral/wallet")
      .then((res) => setWalletBalance(Number(res.data?.data?.balance) || 0))
      .catch(() => {});
  }, [booking]);

  useEffect(() => {
    if (bookingStatus !== "PENDING") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await client.get(`/bookings/${bookingId}`);
        const b = res.data.data.booking;
        setBooking(b);
        setBookingStatus(b.status);
      } catch {}
    }, 8000);
    return () => clearInterval(pollRef.current);
  }, [bookingId, bookingStatus]);

  useFocusEffect(
    useCallback(() => {
      if (!awaitingBrowserReturnRef.current) return;
      (async () => {
        const b = await loadBooking();
        awaitingBrowserReturnRef.current = false;
        if (!b) return;
        if (b.status === "ACCEPTED" && b.payment?.status === "HELD") {
          toast.success(
            t("payment.initiate.success.cardHeld", "Payment successful"),
          );
          navigation.replace("BookingDetail", {
            bookingId,
            payment: "success",
          });
        } else if (b.payment?.status === "PENDING") {
          toast.info(
            t("payment.initiate.success.cardPending", "Payment pending"),
          );
          navigation.replace("BookingDetail", {
            bookingId,
            payment: "pending",
          });
        } else {
          navigation.replace("BookingDetail", {
            bookingId,
            payment: "returned",
          });
        }
      })();
    }, [bookingId, t, navigation]),
  );

  const p = useMemo(
    () => calcPricing(booking, referralApplied ? referralAmount : 0),
    [booking, referralApplied, referralAmount],
  );

  const isJobPostBooking = booking?.source === "JOB_POST";
  const currency = p.currency || booking?.currency || "NGN";
  const PLATFORM_FEE_RATE = getHirerFeeRate(currency);

  const displayedTotal = useMemo(() => {
    if (!booking) return 0;
    if (p.totalCharged > 0) return p.totalCharged;
    const baseAmount = isJobPostBooking
      ? Number(booking.agreedRate || 0)
      : Number(p.subtotal || booking.agreedRate || 0);
    const platformFee = isJobPostBooking
      ? Math.round(baseAmount * PLATFORM_FEE_RATE * 100) / 100
      : Number(p.hirerFee || 0);
    const discount = referralApplied && referralAmount > 0 ? referralAmount : 0;
    return Math.max(0, baseAmount + platformFee - discount);
  }, [
    booking,
    isJobPostBooking,
    p.subtotal,
    p.hirerFee,
    p.totalCharged,
    PLATFORM_FEE_RATE,
    referralApplied,
    referralAmount,
  ]);

  const feePercentDisplay =
    p.feePercent !== undefined ? p.feePercent : PLATFORM_FEE_RATE * 100;

  const handlePercentChange = (pct) => {
    const subtotal = p.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const amount = Math.round((pct / 100) * subtotal);
    const final = Math.min(amount, maxDiscount);
    setReferralPercent(pct);
    setReferralAmount(final);
    setReferralApplied(final > 0);
  };

  const handleReferralToggle = () => {
    if (referralAmount === 0) return;
    setReferralApplied((v) => !v);
  };

  const pickReceipt = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted)
        return toast.error(
          t("payment.initiate.errors.mediaPermission", "Permission required"),
        );
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE)
        return toast.error(
          t("payment.initiate.errors.fileTooLarge", "File too large (max 5MB)"),
        );
      setCryptoReceiptFile({
        uri: asset.uri,
        name: asset.fileName || `receipt_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      });
    } catch {
      toast.error(
        t("payment.initiate.errors.imagePicker", "Could not open gallery"),
      );
    }
  };

  const handleCardPay = async () => {
    if (paying) return;
    setPaying(true);
    setError("");
    try {
      const res = await client.post(`/payments/initiate/${bookingId}`, {
        referralAmount: referralApplied ? referralAmount : 0,
      });
      const { paymentUrl } = res.data.data;
      if (!paymentUrl)
        return setError(
          t("payment.initiate.errors.noPaymentUrl", "No payment URL received"),
        );
      const canOpen = await Linking.canOpenURL(paymentUrl);
      if (!canOpen)
        return setError(
          t(
            "payment.initiate.errors.cannotOpenUrl",
            "Cannot open payment link",
          ),
        );
      awaitingBrowserReturnRef.current = true;
      await Linking.openURL(paymentUrl);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t(
            "payment.initiate.errors.cardInitiateFailed",
            "Payment initiation failed",
          ),
      );
    } finally {
      setPaying(false);
    }
  };

  const handleCrypto = async () => {
    if (paying) return;
    setPaying(true);
    setError("");
    try {
      const res = await client.post(`/payments/crypto/${bookingId}`, {
        cryptoCurrency: selectedCryptoToken,
        amount: displayedTotal,
        currency,
        referralAmount: referralApplied ? referralAmount : 0,
      });
      setManualData(res.data.data);
      setConfirmStep("crypto");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t(
            "payment.initiate.errors.cryptoInitiateFailed",
            "Could not load crypto details",
          ),
      );
    } finally {
      setPaying(false);
    }
  };

  const confirmCrypto = async () => {
    if (!confirmForm.txHash)
      return setError(
        t(
          "payment.initiate.errors.txHashRequired",
          "Transaction hash is required",
        ),
      );
    setConfirming(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("txHash", confirmForm.txHash);
      fd.append("cryptoCurrency", selectedCryptoToken);
      if (confirmForm.cryptoAmount)
        fd.append("cryptoAmount", confirmForm.cryptoAmount);
      if (cryptoReceiptFile)
        fd.append("proof", {
          uri: cryptoReceiptFile.uri,
          name: cryptoReceiptFile.name,
          type: cryptoReceiptFile.type,
        });
      if (referralApplied && referralAmount > 0)
        fd.append("referralAmount", String(referralAmount));
      await client.patch(`/payments/crypto/${bookingId}/confirm`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(
        t("payment.initiate.success.cryptoSubmitted", "Transfer confirmed"),
      );
      navigation.replace("BookingDetail", { bookingId, payment: "success" });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t(
            "payment.initiate.errors.cryptoConfirmFailed",
            "Confirmation failed",
          ),
      );
    } finally {
      setConfirming(false);
    }
  };

  const handlePrimary = () => {
    if (method === "card") return handleCardPay();
    if (method === "crypto") return handleCrypto();
  };

  const resetToMethodSelect = () => {
    setConfirmStep(null);
    setManualData(null);
    setCryptoReceiptFile(null);
    setConfirmForm({});
    setError("");
  };

  const handleBack = () => navigation.navigate("BookingDetail", { bookingId });

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <PageSkeleton variant="detail" />
      </View>
    );
  }

  if (error && !booking) {
    return (
      <View style={styles.page}>
        <View style={styles.errorBox}>
          <FaExclamationTriangle size={40} color={c.red} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              color: c.text,
              textAlign: "center",
            }}
          >
            {error}
          </AppText>
          <Pressable onPress={handleBack} style={styles.backLink}>
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText style={{ fontSize: 13, color: c.textDim, marginLeft: 4 }}>
              {t("payment.initiate.actions.backToBookings", "Back to Bookings")}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (confirmStep && manualData) {
    const cd = manualData.cryptoDetails;

    return (
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.payWrap}>
          <View style={styles.payHeader}>
            <Pressable
              onPress={resetToMethodSelect}
              style={styles.changeMethodBtn}
            >
              <FaArrowLeft size={11} color={c.textDim} />
              <AppText
                style={{
                  fontSize: 13,
                  color: c.textDim,
                  fontWeight: "600",
                  marginLeft: 4,
                }}
              >
                {t("payment.initiate.actions.changeMethod", "Change method")}
              </AppText>
            </Pressable>
            <View
              style={[
                styles.payBadge,
                { borderColor: c.orangeGlow, backgroundColor: c.orangeDim },
              ]}
            >
              <FaBitcoin size={10} color={c.orange} />
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: c.orange,
                  marginLeft: 4,
                }}
              >
                {selectedCryptoToken}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View style={styles.summaryTop}>
              <View
                style={[
                  styles.summaryIconWrap,
                  { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                ]}
              >
                <FaBitcoin size={20} color={c.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.summaryLabel}>
                  {t("payment.initiate.crypto.sendExactly", "SEND EXACTLY")}
                </AppText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <AppText style={styles.summaryTitle}>
                    {convertedCryptoAmount && selectedCryptoToken
                      ? `${convertedCryptoAmount.toFixed(6)} ${selectedCryptoToken}`
                      : formatPrice(displayedTotal, currency)}
                  </AppText>
                  {convertedCryptoAmount && (
                    <Pressable
                      onPress={() =>
                        handleCopy(
                          `${convertedCryptoAmount.toFixed(6)} ${selectedCryptoToken}`,
                          "cryptoAmount",
                        )
                      }
                      style={styles.copyFieldBtn}
                    >
                      {copied.cryptoAmount ? (
                        <FaCheck size={14} color={c.orange} />
                      ) : (
                        <FaCopy size={14} color={c.textMuted} />
                      )}
                    </Pressable>
                  )}
                </View>
                {referralApplied && referralAmount > 0 && (
                  <AppText
                    style={{ fontSize: 11, color: c.green, marginTop: 4 }}
                  >
                    <FaCheckCircle size={10} color={c.green} />{" "}
                    {t("payment.initiate.crypto.includesReferral", {
                      amount: formatPrice(referralAmount, currency),
                      defaultValue: "Includes {{amount}} referral discount",
                    })}
                  </AppText>
                )}
                <AppText style={[styles.summaryCategory, { marginTop: 4 }]}>
                  {t("payment.initiate.crypto.refLabel", {
                    reference: manualData.reference,
                    defaultValue: "Ref: {{reference}}",
                  })}
                </AppText>
              </View>
            </View>

            {cd && (
              <View style={styles.summaryMeta}>
                {cd.network && (
                  <View style={styles.metaItem}>
                    <FaGlobe size={12} color={c.textDim} />
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.metaRowLabel}>
                        {t("payment.initiate.crypto.fields.network", "NETWORK")}
                      </AppText>
                      <AppText style={styles.metaRowValue}>
                        {cd.network}
                      </AppText>
                    </View>
                  </View>
                )}
                {cd.wallet && (
                  <View style={styles.metaItem}>
                    <FaWallet size={12} color={c.textDim} />
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.metaRowLabel}>
                        {t("payment.initiate.crypto.fields.wallet", "WALLET")}
                      </AppText>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <AppText
                          style={[styles.metaRowValue, { flex: 1 }]}
                          numberOfLines={2}
                        >
                          {cd.wallet}
                        </AppText>
                        <Pressable
                          onPress={() => handleCopy(cd.wallet, "cryptoWallet")}
                          style={styles.copyFieldBtn}
                        >
                          {copied.cryptoWallet ? (
                            <FaCheck size={14} color={c.orange} />
                          ) : (
                            <FaCopy size={14} color={c.textMuted} />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
                {cd.currency && (
                  <View style={styles.metaItem}>
                    <FaBitcoin size={12} color={c.textDim} />
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.metaRowLabel}>
                        {t("payment.initiate.crypto.fields.token", "TOKEN")}
                      </AppText>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <AppText style={[styles.metaRowValue, { flex: 1 }]}>
                          {cd.currency}
                        </AppText>
                        <Pressable
                          onPress={() => handleCopy(cd.currency, "cryptoToken")}
                          style={styles.copyFieldBtn}
                        >
                          {copied.cryptoToken ? (
                            <FaCheck size={14} color={c.orange} />
                          ) : (
                            <FaCopy size={14} color={c.textMuted} />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
                {cd.note && (
                  <View style={styles.metaItem}>
                    <FaFileAlt size={12} color={c.textDim} />
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.metaRowLabel}>
                        {t("payment.initiate.crypto.fields.memo", "MEMO")}
                      </AppText>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <AppText
                          style={[styles.metaRowValue, { flex: 1 }]}
                          numberOfLines={2}
                        >
                          {cd.note}
                        </AppText>
                        <Pressable
                          onPress={() => handleCopy(cd.note, "cryptoMemo")}
                          style={styles.copyFieldBtn}
                        >
                          {copied.cryptoMemo ? (
                            <FaCheck size={14} color={c.orange} />
                          ) : (
                            <FaCopy size={14} color={c.textMuted} />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText style={styles.breakdownTitle}>
              {t(
                "payment.initiate.crypto.confirmTransferTitle",
                "CONFIRM YOUR TRANSFER",
              )}
            </AppText>
            <View style={styles.manualFields}>
              <View style={styles.manualField}>
                <AppText style={styles.manualLabel}>
                  {t(
                    "payment.initiate.crypto.fields.txHash",
                    "TRANSACTION HASH *",
                  )}
                </AppText>
                <TextInput
                  style={[
                    styles.manualInput,
                    {
                      color: c.text,
                      borderColor: c.border,
                      backgroundColor: c.bgInput,
                      fontFamily: "monospace",
                    },
                  ]}
                  placeholder={t(
                    "payment.initiate.crypto.placeholders.txHash",
                    "0x... or TRC20 / BTC tx hash",
                  )}
                  placeholderTextColor={c.textMuted}
                  value={confirmForm.txHash || ""}
                  onChangeText={(v) =>
                    setConfirmForm((f) => ({ ...f, txHash: v }))
                  }
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.manualField}>
                <AppText style={styles.manualLabel}>
                  {t(
                    "payment.initiate.crypto.fields.amountOptional",
                    "AMOUNT SENT (OPTIONAL)",
                  )}
                </AppText>
                <TextInput
                  style={[
                    styles.manualInput,
                    {
                      color: c.text,
                      borderColor: c.border,
                      backgroundColor: c.bgInput,
                    },
                  ]}
                  placeholder={t(
                    "payment.initiate.crypto.placeholders.amount",
                    {
                      token: selectedCryptoToken,
                      defaultValue: "Amount in {{token}}",
                    },
                  )}
                  placeholderTextColor={c.textMuted}
                  keyboardType="decimal-pad"
                  value={confirmForm.cryptoAmount || ""}
                  onChangeText={(v) =>
                    setConfirmForm((f) => ({
                      ...f,
                      cryptoAmount: v.replace(/[^0-9.]/g, ""),
                    }))
                  }
                />
              </View>
              <View style={styles.manualField}>
                <AppText style={styles.manualLabel}>
                  {t(
                    "payment.initiate.crypto.fields.receipt",
                    "TRANSACTION SCREENSHOT (OPTIONAL)",
                  )}
                </AppText>
                <Pressable
                  onPress={pickReceipt}
                  style={[
                    styles.fileUploadBtn,
                    { borderColor: c.border, backgroundColor: c.bgCard },
                  ]}
                >
                  <FaPaperclip size={14} color={c.textDim} />
                  <AppText
                    style={{
                      fontSize: 13,
                      color: c.textDim,
                      fontWeight: "600",
                      marginLeft: 8,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {cryptoReceiptFile
                      ? cryptoReceiptFile.name
                      : t(
                          "payment.initiate.crypto.placeholders.receipt",
                          "Upload screenshot",
                        )}
                  </AppText>
                </Pressable>
                {cryptoReceiptFile && (
                  <Pressable
                    onPress={() => setCryptoReceiptFile(null)}
                    style={{ alignSelf: "flex-start", marginTop: 6 }}
                  >
                    <AppText style={{ fontSize: 12, color: c.red }}>
                      ✕ {t("payment.initiate.crypto.removeReceipt", "Remove")}
                    </AppText>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {error && (
            <View
              style={[
                styles.inlineError,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.2)",
                },
              ]}
            >
              <FaExclamationTriangle size={14} color={c.red} />
              <AppText
                style={{ fontSize: 13, color: c.red, flex: 1, marginLeft: 8 }}
              >
                {error}
              </AppText>
            </View>
          )}

          <Pressable
            onPress={confirmCrypto}
            disabled={confirming}
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: confirming ? c.bgCard : c.orange,
                opacity: confirming ? 0.6 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {confirming ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ActivityIndicator color={c.bg} />
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 15,
                    color: c.bg,
                  }}
                >
                  {t("payment.initiate.actions.submitting", "Submitting…")}
                </AppText>
              </View>
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <FaCheckCircle size={16} color={c.bg} />
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 10,
                    color: c.bg,
                  }}
                >
                  {t(
                    "payment.initiate.actions.confirmTransfer",
                    "I Have Transferred — Confirm",
                  )}
                </AppText>
              </View>
            )}
          </Pressable>

          <AppText
            style={{
              fontSize: 12,
              color: c.textMuted,
              textAlign: "center",
              marginTop: 12,
              lineHeight: 16,
            }}
          >
            {t(
              "payment.initiate.crypto.confirmDisclaimer",
              "We'll verify on-chain within 30 minutes. By confirming, you agree to our Refund Policy.",
            )}
          </AppText>
        </ScrollView>
      </View>
    );
  }

  if (bookingStatus === "PENDING") {
    return (
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.payWrap}>
          <View style={styles.payHeader}>
            <Pressable onPress={handleBack} style={styles.backLink}>
              <FaArrowLeft size={11} color={c.textDim} />
              <AppText
                style={{ fontSize: 13, color: c.textDim, marginLeft: 4 }}
              >
                {t("payment.initiate.actions.viewBooking", "View Booking")}
              </AppText>
            </Pressable>
            <View
              style={[
                styles.payBadge,
                { borderColor: c.orangeGlow, backgroundColor: c.orangeDim },
              ]}
            >
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: c.orange }}
              >
                ⏳ {t("payment.initiate.pending.badge", "Pending Acceptance")}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View style={styles.summaryTop}>
              <View
                style={[
                  styles.summaryIconWrap,
                  { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                ]}
              >
                <FaClipboardList size={18} color={c.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.summaryLabel}>
                  {t(
                    "payment.initiate.pending.bookingCreated",
                    "Booking created",
                  )}
                </AppText>
                <AppText style={styles.summaryTitle}>{booking?.title}</AppText>
                <AppText style={styles.summaryCategory}>
                  {booking?.worker?.firstName} {booking?.worker?.lastName} ·{" "}
                  {booking?.category?.name}
                </AppText>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText style={styles.breakdownTitle}>
              {t("payment.initiate.pending.paymentPreview", "Payment Preview")}
            </AppText>
            <View style={styles.breakdownRows}>
              <BreakdownRow
                label={
                  isJobPostBooking
                    ? t("payment.initiate.labels.agreedTotal", "Agreed Total")
                    : t("payment.initiate.labels.agreedRate", "Agreed Rate")
                }
                value={`${formatPrice(p.agreedRate, currency)}${!isJobPostBooking ? p.unitSuffix || "" : ""}`}
                c={c}
              />
              {isJobPostBooking && booking?.estimatedValue && (
                <BreakdownRow
                  label={t("payment.initiate.labels.duration", "Duration")}
                  value={`${booking.estimatedValue} ${booking.estimatedUnit || "hours"}`}
                  c={c}
                />
              )}
              {!isJobPostBooking && p.hasQty && (
                <>
                  <BreakdownRow
                    label={t("payment.initiate.labels.duration", "Duration")}
                    value={`${p.qty} ${p.unitLabel}${p.qty !== 1 ? "s" : ""}`}
                    c={c}
                  />
                  <BreakdownRow
                    label={t("payment.initiate.labels.jobValue", {
                      qty: p.qty,
                      rate: formatPrice(p.agreedRate, currency),
                      defaultValue: "Job Value ({{qty}} × {{rate}})",
                    })}
                    value={formatPrice(p.subtotal, currency)}
                    c={c}
                  />
                </>
              )}
              <BreakdownRow
                label={t("payment.initiate.labels.serviceFee", {
                  percent: feePercentDisplay,
                  defaultValue: "Service Fee ({{percent}}%)",
                })}
                value={`+ ${formatPrice(p.hirerFee, currency)}`}
                c={c}
              />
              <BreakdownRow
                label={t(
                  "payment.initiate.labels.workerReceives",
                  "Worker receives (no fee)",
                )}
                value={formatPrice(p.workerPayout, currency)}
                valueColor={c.green}
                c={c}
              />
              {referralApplied && referralAmount > 0 && (
                <BreakdownRow
                  label={t(
                    "payment.initiate.labels.referralBonus",
                    "Referral bonus",
                  )}
                  value={`− ${formatPrice(referralAmount, currency)}`}
                  valueColor={c.green}
                  c={c}
                />
              )}
              <View
                style={[styles.breakdownDivider, { backgroundColor: c.border }]}
              />
              <BreakdownRow
                label={t("payment.initiate.labels.youWillPay", "You Will Pay")}
                value={formatPrice(displayedTotal, currency)}
                total
                c={c}
              />
            </View>
          </View>

          <View style={styles.verifyWrap}>
            <ActivityIndicator size="large" color="#eab308" />
            <AppText style={[styles.verifyTitle, { color: "#eab308" }]}>
              {t(
                "payment.initiate.pending.waitingForWorker",
                "Waiting for Worker",
              )}
            </AppText>
            <AppText style={styles.verifyText}>
              {t(
                "payment.initiate.pending.waitingBody",
                "Once they accept, you'll be able to complete payment here. This page checks every 8 seconds.",
              )}
            </AppText>
          </View>

          <Pressable
            onPress={loadBooking}
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 15,
                color: c.textDim,
              }}
            >
              🔄{" "}
              {t("payment.initiate.actions.checkUpdates", "Check for Updates")}
            </AppText>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.payWrap}>
        <View style={styles.payHeader}>
          <Pressable onPress={handleBack} style={styles.backLink}>
            <FaArrowLeft size={11} color={c.textDim} />
            <AppText style={{ fontSize: 13, color: c.textDim, marginLeft: 4 }}>
              {t("payment.initiate.actions.backToBooking", "Back to Booking")}
            </AppText>
          </Pressable>
          <View
            style={[
              styles.payBadge,
              { borderColor: c.orangeGlow, backgroundColor: c.orangeDim },
            ]}
          >
            <FaLock size={10} color={c.orange} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: c.orange,
                marginLeft: 4,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              {t("payment.initiate.secureBadge", "Secure Payment")}
            </AppText>
          </View>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.summaryTop}>
            <View
              style={[
                styles.summaryIconWrap,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              <FaClipboardList size={20} color={c.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.summaryLabel}>
                {t(
                  "payment.initiate.summary.youPayingFor",
                  "You're paying for",
                )}
              </AppText>
              <AppText style={styles.summaryTitle}>{booking?.title}</AppText>
              <AppText style={styles.summaryCategory}>
                {booking?.category?.name}
              </AppText>
            </View>
          </View>

          {isJobPostBooking && (
            <View
              style={[
                styles.jobPostNote,
                {
                  backgroundColor: "rgba(129,140,248,0.08)",
                  borderColor: "rgba(129,140,248,0.25)",
                },
              ]}
            >
              <FaBriefcase size={14} color="#818cf8" />
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#818cf8",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginBottom: 2,
                  }}
                >
                  {t("payment.initiate.summary.fromJobPost", "From Job Post")}
                </AppText>
                <AppText
                  style={{ fontSize: 11, color: c.textDim, lineHeight: 15 }}
                >
                  {t(
                    "payment.initiate.summary.fromJobPostBody",
                    "This booking was created from a job post. The final amount is the rate you selected (or negotiated) on the booking creation page.",
                  )}
                </AppText>
              </View>
            </View>
          )}

          <View style={styles.summaryMeta}>
            <View style={styles.metaItem}>
              <FaUser size={11} color={c.textDim} />
              <AppText style={styles.metaText} numberOfLines={1}>
                {booking?.worker?.firstName} {booking?.worker?.lastName}
              </AppText>
            </View>
            <View style={styles.metaItem}>
              <FaCalendarAlt size={11} color={c.textDim} />
              <AppText style={styles.metaText} numberOfLines={1}>
                {new Date(booking?.scheduledAt).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </AppText>
            </View>
            {booking?.address && (
              <View style={styles.metaItem}>
                <FaMapMarkerAlt size={11} color={c.textDim} />
                <AppText style={styles.metaText} numberOfLines={1}>
                  {booking.address}
                </AppText>
              </View>
            )}
          </View>
        </View>

        {walletBalance > 0 && booking?.currency === "NGN" && (
          <View
            style={[
              styles.referralSection,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <View style={styles.referralHeader}>
              <FaGift size={13} color={c.green} />
              <AppText style={styles.referralTitle}>
                {t("payment.initiate.referral.balanceLabel", {
                  amount: formatPrice(walletBalance, "NGN"),
                  defaultValue: "Referral Wallet Balance: {{amount}}",
                })}
              </AppText>
            </View>
            <View style={styles.referralSliderWrap}>
              <View style={styles.presetRow}>
                {[25, 50, 75, 100].map((pct) => (
                  <Pressable
                    key={pct}
                    onPress={() => handlePercentChange(pct)}
                    style={[
                      styles.presetPill,
                      {
                        borderColor:
                          referralPercent === pct ? c.orange : c.border,
                        backgroundColor:
                          referralPercent === pct ? c.orangeDim : c.bgInput,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontFamily: "Syne_800ExtraBold",
                        fontSize: 14,
                        color: c.orange,
                      }}
                    >
                      {pct}%
                    </AppText>
                    <AppText style={{ fontSize: 10, color: c.textDim }}>
                      {formatPrice(
                        Math.min(
                          Math.round((pct / 100) * (p.subtotal || 0)),
                          walletBalance,
                        ),
                        "NGN",
                      )}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.referralRow}>
                <AppText style={styles.referralPercent}>
                  {referralPercent}%
                </AppText>
                <AppText style={styles.referralAmount}>
                  {formatPrice(referralAmount, "NGN")}
                </AppText>
                <Pressable
                  onPress={handleReferralToggle}
                  disabled={referralAmount === 0}
                  style={[
                    styles.referralToggleBtn,
                    referralApplied && {
                      backgroundColor: c.orange,
                      borderColor: c.orange,
                    },
                    referralAmount === 0 && { opacity: 0.4 },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: referralApplied ? "#fff" : c.textDim,
                    }}
                  >
                    {referralApplied
                      ? t("payment.initiate.referral.remove", "Remove")
                      : t("payment.initiate.referral.apply", "Apply")}
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <View
          style={[
            styles.breakdownCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={styles.breakdownTitle}>
            {t("payment.initiate.breakdown.title", "Payment Breakdown")}
          </AppText>
          <View style={styles.breakdownRows}>
            <BreakdownRow
              label={
                isJobPostBooking
                  ? t("payment.initiate.labels.agreedTotal", "Agreed Total")
                  : t("payment.initiate.labels.agreedRate", "Agreed Rate")
              }
              value={`${formatPrice(p.agreedRate, currency)}${!isJobPostBooking ? p.unitSuffix || "" : ""}`}
              c={c}
            />
            {isJobPostBooking && booking?.estimatedValue && (
              <BreakdownRow
                label={t("payment.initiate.labels.duration", "Duration")}
                value={`${booking.estimatedValue} ${booking.estimatedUnit || "hours"}`}
                c={c}
              />
            )}
            {!isJobPostBooking && p.hasQty && (
              <>
                <BreakdownRow
                  label={t("payment.initiate.labels.duration", "Duration")}
                  value={`${p.qty} ${p.unitLabel}${p.qty !== 1 ? "s" : ""}`}
                  c={c}
                />
                <BreakdownRow
                  label={t("payment.initiate.labels.jobValue", {
                    qty: p.qty,
                    rate: formatPrice(p.agreedRate, currency),
                    defaultValue: "Job Value ({{qty}} × {{rate}})",
                  })}
                  value={formatPrice(p.subtotal, currency)}
                  c={c}
                />
              </>
            )}
            <BreakdownRow
              label={t("payment.initiate.labels.serviceFee", {
                percent: feePercentDisplay,
                defaultValue: "Service Fee ({{percent}}%)",
              })}
              value={`+ ${formatPrice(p.hirerFee, currency)}`}
              c={c}
            />
            <BreakdownRow
              label={t(
                "payment.initiate.labels.workerReceives",
                "Worker receives (no fee)",
              )}
              value={formatPrice(p.workerPayout, currency)}
              valueColor={c.green}
              c={c}
            />
            {referralApplied && referralAmount > 0 && (
              <BreakdownRow
                label={t(
                  "payment.initiate.labels.referralBonus",
                  "Referral bonus",
                )}
                value={`− ${formatPrice(referralAmount, currency)}`}
                valueColor={c.green}
                c={c}
              />
            )}
            <View
              style={[styles.breakdownDivider, { backgroundColor: c.border }]}
            />
            <BreakdownRow
              label={t("payment.initiate.labels.youPay", "You Pay")}
              value={formatPrice(displayedTotal, currency)}
              total
              c={c}
            />
          </View>
          <View
            style={[
              styles.escrowNote,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            <FaShieldAlt size={13} color={c.orange} />
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                flex: 1,
                marginLeft: 6,
                lineHeight: 16,
              }}
            >
              {t(
                "payment.initiate.breakdown.escrowNote",
                "Funds are held in escrow and only released to the worker after you confirm the job is complete.",
              )}
            </AppText>
          </View>
        </View>

        <View
          style={[
            styles.breakdownCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={styles.breakdownTitle}>
            {t("payment.initiate.method.title", "Payment Method")}
          </AppText>
          <View style={styles.methodGrid}>
            {METHODS.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  setMethod(m.id);
                  setError("");
                }}
                style={[
                  styles.methodCard,
                  {
                    borderColor: method === m.id ? c.orange : c.border,
                    backgroundColor: method === m.id ? c.orangeDim : c.bgCard,
                  },
                ]}
              >
                {m.id === "card" ? (
                  <FaCreditCard
                    size={18}
                    color={method === m.id ? c.orange : c.textDim}
                  />
                ) : (
                  <FaBitcoin
                    size={18}
                    color={method === m.id ? c.orange : c.textDim}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <AppText
                    style={{
                      fontFamily: "DMSans_700Bold",
                      fontSize: 13,
                      color: method === m.id ? c.orange : c.text,
                    }}
                  >
                    {t(m.labelKey)}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 11,
                      color: c.textMuted,
                      marginTop: 1,
                      fontFamily: "DMSans_400Regular",
                    }}
                  >
                    {t(m.descKey)}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>

          {method === "crypto" && (
            <CryptoRateConverter
              fiatAmount={displayedTotal}
              fiatCurrency={currency || "NGN"}
              selectedToken={selectedCryptoToken}
              onAmountChange={(data) => {
                setSelectedCryptoToken(data.token);
                setConvertedCryptoAmount(data.amount);
              }}
            />
          )}

          {method === "card" && (
            <View
              style={[
                styles.providerNote,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText
                style={{
                  fontSize: 12,
                  color: c.textDim,
                  fontFamily: "DMSans_400Regular",
                }}
              >
                {booking?.currency === "NGN"
                  ? t(
                      "payment.initiate.method.card.paystackNote",
                      "💚 You'll be redirected to Paystack to pay securely in NGN.",
                    )
                  : t(
                      "payment.initiate.method.card.flutterwaveNote",
                      "🦋 You'll be redirected to Flutterwave to pay securely.",
                    )}
              </AppText>
            </View>
          )}
        </View>

        {error && (
          <View
            style={[
              styles.inlineError,
              { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
            ]}
          >
            <FaExclamationTriangle size={11} color={c.red} />
            <AppText
              style={{ fontSize: 13, color: c.red, flex: 1, marginLeft: 6 }}
            >
              {error}
            </AppText>
          </View>
        )}

        <Pressable
          onPress={handlePrimary}
          disabled={paying}
          style={({ pressed }) => [
            styles.payBtn,
            {
              backgroundColor: paying ? c.bgCard : c.orange,
              opacity: paying ? 0.6 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {paying ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ActivityIndicator color={c.bg} />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 15,
                  color: c.bg,
                }}
              >
                {t("payment.initiate.actions.processing", "Processing…")}
              </AppText>
            </View>
          ) : method === "card" ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <FaCreditCard size={14} color={c.bg} />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 10,
                  color: c.bg,
                }}
              >
                {t("payment.initiate.actions.payCard", {
                  amount: formatPrice(displayedTotal, currency),
                  defaultValue: "Pay {{amount}} Securely",
                })}
              </AppText>
            </View>
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <FaBitcoin size={14} color={c.bg} />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 10,
                  color: c.bg,
                }}
              >
                {t("payment.initiate.actions.payCrypto", {
                  token: selectedCryptoToken,
                  amount: formatPrice(displayedTotal, currency),
                  defaultValue: "Get {{token}} Wallet — {{amount}}",
                })}
              </AppText>
            </View>
          )}
        </Pressable>

        <AppText
          style={{
            fontSize: 11,
            color: c.textMuted,
            textAlign: "center",
            marginTop: 8,
            lineHeight: 16,
            fontFamily: "DMSans_400Regular",
          }}
        >
          {t(
            "payment.initiate.disclaimer",
            "Powered by Flutterwave & Paystack · Escrow protected · Refund policy applies",
          )}
        </AppText>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <FaLock size={9} color={c.textMuted} />
            <AppText
              style={{
                fontSize: 11,
                color: c.textMuted,
                marginLeft: 3,
                fontFamily: "DMSans_400Regular",
              }}
            >
              256-bit SSL
            </AppText>
          </View>
          <View style={styles.trustItem}>
            <FaShieldAlt size={9} color={c.textMuted} />
            <AppText
              style={{
                fontSize: 11,
                color: c.textMuted,
                marginLeft: 3,
                fontFamily: "DMSans_400Regular",
              }}
            >
              Escrow protected
            </AppText>
          </View>
          <View style={styles.trustItem}>
            <AppText style={{ fontSize: 11, color: c.textMuted }}>
              🦋 Flutterwave
            </AppText>
          </View>
          <View style={styles.trustItem}>
            <AppText style={{ fontSize: 11, color: c.textMuted }}>
              💚 Paystack
            </AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function BreakdownRow({ label, value, valueColor, total, c }) {
  return (
    <View style={styles.breakdownRow}>
      <AppText
        style={
          total
            ? [styles.breakdownLabelTotal, { color: c.text }]
            : [styles.breakdownLabel, { color: c.textDim }]
        }
      >
        {label}
      </AppText>
      <AppText
        style={
          total
            ? [styles.breakdownValTotal, { color: c.orange }]
            : [styles.breakdownVal, { color: valueColor || c.text }]
        }
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  payWrap: { padding: 12, paddingBottom: 40, gap: 12 },
  payHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backLink: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  changeMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  payBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  summaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#888",
    marginBottom: 4,
    fontFamily: "DMSans_700Bold",
  },
  summaryTitle: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 11,
    color: "#fff",
    lineHeight: 18,
    marginBottom: 3,
  },
  summaryCategory: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f97316",
    fontFamily: "DMSans_700Bold",
  },
  summaryMeta: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  metaItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  metaText: {
    fontSize: 12,
    color: "#aaa",
    flex: 1,
    fontFamily: "DMSans_400Regular",
  },
  metaRowLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#666",
    fontFamily: "DMSans_700Bold",
  },
  metaRowValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    flexWrap: "wrap",
    fontFamily: "DMSans_700Bold",
  },
  breakdownCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  breakdownTitle: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#666",
    marginBottom: 12,
    fontFamily: "DMSans_700Bold",
  },
  breakdownRows: { gap: 8 },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
    fontFamily: "DMSans_400Regular",
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    fontFamily: "DMSans_700Bold",
  },
  breakdownDivider: { height: 1, marginVertical: 4 },
  breakdownLabelTotal: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
    fontFamily: "DMSans_700Bold",
  },
  breakdownValTotal: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 15,
    textAlign: "right",
  },
  escrowNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
  },
  jobPostNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  referralSection: { borderRadius: 8, borderWidth: 1, padding: 12, gap: 8 },
  referralHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  referralTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
    fontFamily: "DMSans_700Bold",
  },
  referralSliderWrap: { gap: 6 },
  presetRow: { flexDirection: "row", gap: 6 },
  presetPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  referralRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  referralPercent: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f97316",
    minWidth: 34,
    fontFamily: "DMSans_700Bold",
  },
  referralAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    textAlign: "right",
    fontFamily: "DMSans_700Bold",
  },
  referralToggleBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderColor: "#333",
  },
  methodGrid: { gap: 6 },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  providerNote: { marginTop: 8, borderRadius: 6, borderWidth: 1, padding: 8 },
  manualFields: { gap: 10 },
  manualField: { gap: 4 },
  manualLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#aaa",
    fontFamily: "DMSans_700Bold",
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
  },
  fileUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  copyFieldBtn: { padding: 4, marginLeft: 4 },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  payBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyWrap: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 14,
  },
  verifyTitle: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
  verifyText: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "DMSans_400Regular",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  trustItem: { flexDirection: "row", alignItems: "center" },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },
});
