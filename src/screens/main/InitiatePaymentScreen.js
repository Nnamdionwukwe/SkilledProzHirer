// src/screens/main/InitiatePaymentScreen.js
//
// React Native port of components/payment/InitiatePayment.jsx.
//
// Route:      InitiatePayment { bookingId, redirectTo? }
// Fetches:    GET /bookings/:id
//             GET /referral/wallet
// Posts:      POST /payments/initiate/:bookingId      (card)
//             POST /payments/crypto/:bookingId        (crypto details)
//             PATCH /payments/crypto/:bookingId/confirm
//
// Steps:
//   1. Booking PENDING          → "Waiting for Worker" state with poll
//   2. Method selection         → Card / Crypto (with live CryptoRateConverter)
//   3. Crypto details step      → wallet + tx hash + receipt
//   4. Card action              → opens Paystack/Flutterwave in browser,
//                                 then deep-links back to the app on success
//
// i18n: every visible string uses t() under `payment.initiate.*`.

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

import AppScreen from "../../components/AppScreen";
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
  FaTimes,
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

function fmtMoney(amount, currency = "NGN") {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const CRYPTO_TOKENS = ["USDC", "USDT", "BTC", "ETH"];

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
  const [selectedCryptoToken, setSelectedCryptoToken] = useState("USDC");
  const [convertedCryptoAmount, setConvertedCryptoAmount] = useState(null);
  const [step, setStep] = useState("method"); // "method" | "crypto"
  const [cryptoDetails, setCryptoDetails] = useState(null);
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoReceipt, setCryptoReceipt] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralPercent, setReferralPercent] = useState(0);
  const [referralAmount, setReferralAmount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);
  const [copied, setCopied] = useState({});

  const pollRef = useRef(null);
  const awaitingBrowserReturnRef = useRef(false);

  // ── Load booking ─────────────────────────────────────────────────────
  const loadBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await client.get(`/bookings/${bookingId}`);
      const b = res.data.data.booking;
      setBooking(b);
      setBookingStatus(b.status);
      return b;
    } catch (e) {
      setError(
        e?.response?.data?.message || t("payment.initiate.errors.loadBooking"),
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [bookingId, t]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // ── Poll status while PENDING ────────────────────────────────────────
  useEffect(() => {
    if (bookingStatus !== "PENDING") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await client.get(`/bookings/${bookingId}`);
        const b = res.data.data.booking;
        setBooking(b);
        if (b.status !== bookingStatus) {
          setBookingStatus(b.status);
          toast.success(
            t("payment.initiate.pending.statusUpdated", { status: b.status }),
          );
        }
      } catch {}
    }, 8000);
    return () => clearInterval(pollRef.current);
  }, [bookingId, bookingStatus, toast, t]);

  // ── Wallet balance ───────────────────────────────────────────────────
  useEffect(() => {
    if (!booking) return;
    client
      .get("/referral/wallet")
      .then((res) => setWalletBalance(Number(res.data?.data?.balance) || 0))
      .catch(() => {});
  }, [booking]);

  // ── Card payment return: check booking status when app regains focus ─
  useFocusEffect(
    useCallback(() => {
      if (!awaitingBrowserReturnRef.current) return;
      (async () => {
        const b = await loadBooking();
        awaitingBrowserReturnRef.current = false;
        if (!b) return;
        if (b.status === "ACCEPTED" && b.payment?.status === "HELD") {
          toast.success(t("payment.initiate.success.cardHeld"));
          navigation.replace("BookingDetail", {
            bookingId,
            payment: "success",
          });
        } else if (b.payment?.status === "PENDING") {
          toast.info(t("payment.initiate.success.cardPending"));
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingId]),
  );

  // ── Pricing ──────────────────────────────────────────────────────────
  const p = useMemo(
    () => calcPricing(booking, referralApplied ? referralAmount : 0),
    [booking, referralApplied, referralAmount],
  );

  const isJobPostBooking = booking?.source === "JOB_POST";
  const currency = p.currency || booking?.currency || "NGN";

  // FIXED: Correctly calculate the displayed total based on booking type
  let displayedTotal = 0;
  if (booking) {
    const baseAmount = isJobPostBooking
      ? Number(booking.agreedRate)
      : Number(p.subtotal || booking.agreedRate || 0);

    const platformFee = isJobPostBooking
      ? Math.round(baseAmount * getHirerFeeRate(currency) * 100) / 100
      : Number(p.hirerFee || 0);

    const discount = referralApplied && referralAmount > 0 ? referralAmount : 0;

    displayedTotal = Math.max(0, baseAmount + platformFee - discount);
  }

  // ── Referral slider ──────────────────────────────────────────────────
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

  // ── Copy helper ──────────────────────────────────────────────────────
  const handleCopy = async (text, key) => {
    try {
      await Clipboard.setStringAsync(String(text));
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    } catch {
      toast.error(t("payment.initiate.errors.copyFailed"));
    }
  };

  // ── Receipt pick ─────────────────────────────────────────────────────
  const pickReceipt = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error(t("payment.initiate.errors.mediaPermission"));
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        toast.error(t("payment.initiate.errors.fileTooLarge", { size: 5 }));
        return;
      }
      setCryptoReceipt({
        uri: asset.uri,
        name: asset.fileName || `receipt_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      });
    } catch {
      toast.error(t("payment.initiate.errors.imagePicker"));
    }
  };

  // ── Card pay ─────────────────────────────────────────────────────────
  const handleCardPay = async () => {
    if (paying) return;
    setPaying(true);
    setError("");
    try {
      const res = await client.post(`/payments/initiate/${bookingId}`, {
        referralAmount: referralApplied ? referralAmount : 0,
      });
      const { paymentUrl } = res.data.data;
      if (!paymentUrl) {
        setError(t("payment.initiate.errors.noPaymentUrl"));
        return;
      }
      const canOpen = await Linking.canOpenURL(paymentUrl);
      if (!canOpen) {
        setError(t("payment.initiate.errors.cannotOpenUrl"));
        return;
      }
      awaitingBrowserReturnRef.current = true;
      await Linking.openURL(paymentUrl);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t("payment.initiate.errors.cardInitiateFailed"),
      );
    } finally {
      setPaying(false);
    }
  };

  // ── Crypto: initiate ─────────────────────────────────────────────────
  const handleCryptoInitiate = async () => {
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
      setCryptoDetails(res.data.data?.cryptoDetails || res.data.data);
      setStep("crypto");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t("payment.initiate.errors.cryptoInitiateFailed"),
      );
    } finally {
      setPaying(false);
    }
  };

  // ── Crypto: confirm ──────────────────────────────────────────────────
  const handleCryptoConfirm = async () => {
    if (!cryptoTxHash.trim()) {
      setError(t("payment.initiate.errors.txHashRequired"));
      return;
    }
    setConfirming(true);
    setError("");
    try {
      const form = new FormData();
      form.append("txHash", cryptoTxHash.trim());
      form.append("cryptoCurrency", selectedCryptoToken);
      if (cryptoAmount) form.append("cryptoAmount", cryptoAmount);
      if (referralApplied && referralAmount > 0) {
        form.append("referralAmount", String(referralAmount));
      }
      if (cryptoReceipt) {
        form.append("proof", {
          uri: cryptoReceipt.uri,
          name: cryptoReceipt.name,
          type: cryptoReceipt.type,
        });
      }
      await client.patch(`/payments/crypto/${bookingId}/confirm`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(t("payment.initiate.success.cryptoSubmitted"));
      navigation.replace("BookingDetail", {
        bookingId,
        payment: "success",
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          t("payment.initiate.errors.cryptoConfirmFailed"),
      );
    } finally {
      setConfirming(false);
    }
  };

  // ── Back / reset ─────────────────────────────────────────────────────
  const resetToMethod = () => {
    setStep("method");
    setCryptoDetails(null);
    setCryptoTxHash("");
    setCryptoAmount("");
    setCryptoReceipt(null);
    setError("");
  };

  // FIXED: Always return to BookingDetail, not just goBack()
  const handleBack = () => {
    navigation.navigate("BookingDetail", { bookingId });
  };

  // ── Loading / error states ───────────────────────────────────────────
  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="detail" />
      </AppScreen>
    );
  }

  if (error && !booking) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.center}>
          <FaExclamationTriangle size={44} color={c.red} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: c.text,
              marginTop: 14,
              textAlign: "center",
            }}
          >
            {t("payment.initiate.errors.title")}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              marginTop: 6,
              paddingHorizontal: 20,
            }}
          >
            {error}
          </AppText>
          <Pressable
            onPress={handleBack}
            style={[styles.backBtn, { borderColor: c.border, marginTop: 20 }]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
              {t("payment.initiate.actions.backToBookings")}
            </AppText>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  // ── PENDING state ────────────────────────────────────────────────────
  if (bookingStatus === "PENDING") {
    return (
      <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={handleBack} style={styles.topBack}>
          <FaArrowLeft size={12} color={c.textDim} />
          <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
            {t("payment.initiate.actions.viewBooking")}
          </AppText>
        </Pressable>

        <View
          style={[
            styles.badge,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          <AppText style={{ fontSize: 11, fontWeight: "700", color: c.orange }}>
            {t("payment.initiate.pending.badge")}
          </AppText>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={styles.cardEyebrow(c)}>
            {t("payment.initiate.pending.bookingCreated")}
          </AppText>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: c.text,
            }}
          >
            {booking?.title}
          </AppText>
          <AppText style={{ fontSize: 12, color: c.orange, marginTop: 4 }}>
            {booking?.worker?.firstName} {booking?.worker?.lastName} ·{" "}
            {booking?.category?.name}
          </AppText>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={styles.cardEyebrow(c)}>
            {t("payment.initiate.pending.paymentPreview")}
          </AppText>

          <PreviewRow
            label={
              isJobPostBooking
                ? t("payment.initiate.labels.agreedTotal")
                : t("payment.initiate.labels.agreedRate")
            }
            value={`${fmtMoney(p.agreedRate, currency)}${!isJobPostBooking ? p.unitSuffix || "" : ""}`}
            c={c}
          />

          {isJobPostBooking && booking?.estimatedValue ? (
            <PreviewRow
              label={t("payment.initiate.labels.duration")}
              value={`${booking.estimatedValue} ${booking.estimatedUnit || "hours"}`}
              c={c}
            />
          ) : null}

          <PreviewRow
            label={t("payment.initiate.labels.serviceFee", {
              percent: p.feePercent,
            })}
            value={`+ ${fmtMoney(p.hirerFee, currency)}`}
            c={c}
          />

          <PreviewRow
            label={t("payment.initiate.labels.workerReceives")}
            value={fmtMoney(p.workerPayout, currency)}
            valueColor={c.green}
            c={c}
          />

          {referralApplied && referralAmount > 0 ? (
            <PreviewRow
              label={t("payment.initiate.labels.referralBonus")}
              value={`− ${fmtMoney(referralAmount, currency)}`}
              valueColor={c.green}
              c={c}
            />
          ) : null}

          <View
            style={{
              height: 1,
              backgroundColor: c.border,
              marginVertical: 8,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <AppText style={{ fontSize: 14, fontWeight: "700", color: c.text }}>
              {t("payment.initiate.labels.youWillPay")}
            </AppText>
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 18,
                fontWeight: "800",
                color: c.orange,
              }}
            >
              {fmtMoney(displayedTotal, currency)}
            </AppText>
          </View>
        </View>

        <View style={styles.pendingWrap}>
          <ActivityIndicator size="large" color={c.orange} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 17,
              fontWeight: "800",
              color: c.text,
              marginTop: 16,
            }}
          >
            {t("payment.initiate.pending.waitingForWorker")}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            {t("payment.initiate.pending.waitingBody")}
          </AppText>
        </View>

        <Pressable
          onPress={loadBooking}
          style={[
            styles.secondaryBtn,
            { borderColor: c.border, backgroundColor: c.bgCard },
          ]}
        >
          <AppText style={{ fontSize: 13, color: c.textDim }}>
            {t("payment.initiate.actions.checkUpdates")}
          </AppText>
        </Pressable>
      </AppScreen>
    );
  }

  // ── CRYPTO DETAILS STEP ──────────────────────────────────────────────
  if (step === "crypto" && cryptoDetails) {
    return (
      <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={resetToMethod} style={styles.topBack}>
          <FaArrowLeft size={12} color={c.textDim} />
          <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
            {t("payment.initiate.actions.changeMethod")}
          </AppText>
        </Pressable>

        <View
          style={[
            styles.card,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={styles.cardEyebrow(c)}>
            {t("payment.initiate.crypto.sendExactly")}
          </AppText>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 22,
              fontWeight: "800",
              color: c.orange,
              marginBottom: 6,
            }}
          >
            {convertedCryptoAmount && selectedCryptoToken
              ? `${convertedCryptoAmount.toFixed(6)} ${selectedCryptoToken}`
              : fmtMoney(displayedTotal, currency)}
          </AppText>
          {referralApplied && referralAmount > 0 ? (
            <AppText style={{ fontSize: 11, color: c.green, marginBottom: 4 }}>
              <FaCheckCircle size={10} color={c.green} />{" "}
              {t("payment.initiate.crypto.includesReferral", {
                amount: fmtMoney(referralAmount, currency),
              })}
            </AppText>
          ) : null}
          <AppText style={{ fontSize: 11, color: c.textMuted }}>
            {t("payment.initiate.crypto.refLabel", {
              reference: cryptoDetails.reference || "",
            })}
          </AppText>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={styles.cardEyebrow(c)}>
            {t("payment.initiate.crypto.walletDetails")}
          </AppText>

          <MetaRow
            icon={<FaGlobe size={11} color={c.textDim} />}
            label={t("payment.initiate.crypto.fields.network")}
            value={cryptoDetails.network || "—"}
            c={c}
          />
          <MetaRow
            icon={<FaWallet size={11} color={c.textDim} />}
            label={t("payment.initiate.crypto.fields.wallet")}
            value={cryptoDetails.wallet || "—"}
            mono
            copyable
            copied={copied.cryptoWallet}
            onCopy={() => handleCopy(cryptoDetails.wallet, "cryptoWallet")}
            c={c}
          />
          <MetaRow
            icon={<FaBitcoin size={11} color={c.textDim} />}
            label={t("payment.initiate.crypto.fields.token")}
            value={cryptoDetails.currency || selectedCryptoToken}
            c={c}
          />
          {cryptoDetails.note ? (
            <MetaRow
              icon={<FaFileAlt size={11} color={c.textDim} />}
              label={t("payment.initiate.crypto.fields.memo")}
              value={cryptoDetails.note}
              copyable
              copied={copied.cryptoMemo}
              onCopy={() => handleCopy(cryptoDetails.note, "cryptoMemo")}
              c={c}
            />
          ) : null}
        </View>

        <View
          style={[
            styles.warnBox,
            { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
          ]}
        >
          <FaExclamationTriangle size={11} color={c.red} />
          <AppText
            style={{
              fontSize: 12,
              color: c.red,
              flex: 1,
              marginLeft: 6,
              lineHeight: 17,
            }}
          >
            {t("payment.initiate.crypto.networkWarning", {
              token: cryptoDetails.currency || selectedCryptoToken,
              network: cryptoDetails.network || "—",
            })}
          </AppText>
        </View>

        <AppText style={[styles.fieldLabel, { color: c.textDim }]}>
          {t("payment.initiate.crypto.fields.txHash")}
        </AppText>
        <TextInput
          value={cryptoTxHash}
          onChangeText={setCryptoTxHash}
          placeholder={t("payment.initiate.crypto.placeholders.txHash")}
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
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

        <AppText style={[styles.fieldLabel, { color: c.textDim }]}>
          {t("payment.initiate.crypto.fields.amountOptional")}
        </AppText>
        <TextInput
          value={cryptoAmount}
          onChangeText={(v) => setCryptoAmount(v.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          placeholder={t("payment.initiate.crypto.placeholders.amount", {
            token: selectedCryptoToken,
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

        <AppText style={[styles.fieldLabel, { color: c.textDim }]}>
          {t("payment.initiate.crypto.fields.receipt")}
        </AppText>
        <Pressable
          onPress={pickReceipt}
          style={[
            styles.uploadBtn,
            { borderColor: c.border, backgroundColor: c.bgCard },
          ]}
        >
          <FaPaperclip size={12} color={c.textDim} />
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              fontWeight: "600",
              marginLeft: 6,
              flex: 1,
              fontFamily: "DMSans_400Regular",
            }}
            numberOfLines={1}
          >
            {cryptoReceipt
              ? cryptoReceipt.name
              : t("payment.initiate.crypto.placeholders.receipt")}
          </AppText>
        </Pressable>
        {cryptoReceipt ? (
          <Pressable
            onPress={() => setCryptoReceipt(null)}
            style={{ alignSelf: "flex-start", marginTop: 6 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <FaTimes size={10} color={c.red} />
              <AppText style={{ fontSize: 11, color: c.red }}>
                {t("payment.initiate.crypto.removeReceipt")}
              </AppText>
            </View>
          </Pressable>
        ) : null}

        {error ? (
          <View
            style={[
              styles.inlineError,
              { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
            ]}
          >
            <FaExclamationTriangle size={11} color={c.red} />
            <AppText
              style={{ fontSize: 12, color: c.red, flex: 1, marginLeft: 6 }}
            >
              {error}
            </AppText>
          </View>
        ) : null}

        <Pressable
          onPress={handleCryptoConfirm}
          disabled={confirming}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: confirming ? c.bgCard : c.orange,
              opacity: confirming ? 0.6 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {confirming ? (
            <ActivityIndicator color={c.bg} />
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <FaCheckCircle size={14} color={c.bg} />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 14,
                  fontWeight: "800",
                  color: c.bg,
                }}
              >
                {t("payment.initiate.actions.confirmTransfer")}
              </AppText>
            </View>
          )}
        </Pressable>

        <AppText
          style={{
            fontSize: 11,
            color: c.textMuted,
            textAlign: "center",
            marginTop: 10,
            lineHeight: 15,
            fontFamily: "DMSans_400Regular",
          }}
        >
          {t("payment.initiate.crypto.confirmDisclaimer")}
        </AppText>
      </AppScreen>
    );
  }

  // ── METHOD SELECTION STEP ────────────────────────────────────────────
  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      <Pressable onPress={handleBack} style={styles.topBack}>
        <FaArrowLeft size={12} color={c.textDim} />
        <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
          {t("payment.initiate.actions.backToBooking")}
        </AppText>
      </Pressable>

      <View
        style={[
          styles.badge,
          { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
        ]}
      >
        <FaLock size={10} color={c.orange} />
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: c.orange,
            marginLeft: 4,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {t("payment.initiate.secureBadge")}
        </AppText>
      </View>

      {/* Summary card */}
      <View
        style={[
          styles.card,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: c.orangeDim,
              borderWidth: 1,
              borderColor: c.orangeGlow,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaClipboardList size={18} color={c.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.cardEyebrow(c)}>
              {t("payment.initiate.summary.youPayingFor")}
            </AppText>
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 16,
                fontWeight: "800",
                color: c.text,
                marginTop: 2,
              }}
            >
              {booking?.title}
            </AppText>
            <AppText style={{ fontSize: 12, color: c.orange, marginTop: 2 }}>
              {booking?.category?.name}
            </AppText>
          </View>
        </View>

        {isJobPostBooking ? (
          <View
            style={[
              styles.jobPostNote,
              {
                backgroundColor: "rgba(129,140,248,0.08)",
                borderColor: "rgba(129,140,248,0.25)",
              },
            ]}
          >
            <FaBriefcase size={13} color="#818cf8" />
            <View style={{ flex: 1 }}>
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#818cf8",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {t("payment.initiate.summary.fromJobPost")}
              </AppText>
              <AppText
                style={{
                  fontSize: 11,
                  color: c.textDim,
                  marginTop: 2,
                  lineHeight: 15,
                  fontFamily: "DMSans_400Regular",
                }}
              >
                {t("payment.initiate.summary.fromJobPostBody")}
              </AppText>
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 12, gap: 6 }}>
          <MetaRow
            icon={<FaUser size={11} color={c.textDim} />}
            value={`${booking?.worker?.firstName || ""} ${booking?.worker?.lastName || ""}`}
            c={c}
          />
          {booking?.scheduledAt ? (
            <MetaRow
              icon={<FaCalendarAlt size={11} color={c.textDim} />}
              value={new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              c={c}
            />
          ) : null}
          {booking?.address ? (
            <MetaRow
              icon={<FaMapMarkerAlt size={11} color={c.textDim} />}
              value={booking.address}
              c={c}
            />
          ) : null}
        </View>
      </View>

      {/* Referral slider */}
      {walletBalance > 0 && booking?.currency === "NGN" ? (
        <View
          style={[
            styles.card,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <FaGift size={13} color={c.green} />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: c.text,
                flex: 1,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {t("payment.initiate.referral.balanceLabel", {
                amount: fmtMoney(walletBalance, "NGN"),
              })}
            </AppText>
          </View>
          <View style={styles.presetRow}>
            {[25, 50, 75, 100].map((pct) => (
              <Pressable
                key={pct}
                onPress={() => handlePercentChange(pct)}
                style={[
                  styles.presetPill,
                  {
                    borderColor: referralPercent === pct ? c.orange : c.border,
                    backgroundColor:
                      referralPercent === pct ? c.orangeDim : c.bgInput,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 14,
                    fontWeight: "800",
                    color: c.orange,
                  }}
                >
                  {pct}%
                </AppText>
                <AppText style={{ fontSize: 10, color: c.textDim }}>
                  {fmtMoney(
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
          <Pressable
            onPress={handleReferralToggle}
            disabled={referralAmount === 0}
            style={[
              styles.referralApplyBtn,
              {
                backgroundColor: referralApplied ? c.orange : c.bgCard,
                borderColor: referralApplied ? c.orange : c.border,
                opacity: referralAmount === 0 ? 0.4 : 1,
              },
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
                ? t("payment.initiate.referral.remove")
                : t("payment.initiate.referral.apply")}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {/* Breakdown */}
      <View
        style={[
          styles.card,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText style={styles.cardEyebrow(c)}>
          {t("payment.initiate.breakdown.title")}
        </AppText>

        <PreviewRow
          label={
            isJobPostBooking
              ? t("payment.initiate.labels.agreedTotal")
              : t("payment.initiate.labels.agreedRate")
          }
          value={`${fmtMoney(p.agreedRate, currency)}${!isJobPostBooking ? p.unitSuffix || "" : ""}`}
          c={c}
        />

        {isJobPostBooking && booking?.estimatedValue ? (
          <PreviewRow
            label={t("payment.initiate.labels.duration")}
            value={`${booking.estimatedValue} ${booking.estimatedUnit || "hours"}`}
            c={c}
          />
        ) : null}

        {!isJobPostBooking && p.hasQty ? (
          <>
            <PreviewRow
              label={t("payment.initiate.labels.duration")}
              value={`${p.qty} ${p.unitLabel}${p.qty !== 1 ? "s" : ""}`}
              c={c}
            />
            <PreviewRow
              label={t("payment.initiate.labels.jobValue", {
                qty: p.qty,
                rate: fmtMoney(p.agreedRate, currency),
              })}
              value={fmtMoney(p.subtotal, currency)}
              c={c}
            />
          </>
        ) : null}

        <PreviewRow
          label={t("payment.initiate.labels.serviceFee", {
            percent: p.feePercent,
          })}
          value={`+ ${fmtMoney(p.hirerFee, currency)}`}
          c={c}
        />
        <PreviewRow
          label={t("payment.initiate.labels.workerReceives")}
          value={fmtMoney(p.workerPayout, currency)}
          valueColor={c.green}
          c={c}
        />

        {referralApplied && referralAmount > 0 ? (
          <PreviewRow
            label={t("payment.initiate.labels.referralBonus")}
            value={`− ${fmtMoney(referralAmount, currency)}`}
            valueColor={c.green}
            c={c}
          />
        ) : null}

        <View
          style={{
            height: 1,
            backgroundColor: c.border,
            marginVertical: 8,
          }}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <AppText
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: c.text,
              fontFamily: "Syne_700Bold",
            }}
          >
            {t("payment.initiate.labels.youPay")}
          </AppText>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: c.orange,
            }}
          >
            {fmtMoney(displayedTotal, currency)}
          </AppText>
        </View>

        <View
          style={[
            styles.escrowNote,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          <FaShieldAlt size={12} color={c.orange} />
          <AppText
            style={{
              fontSize: 11,
              color: c.textDim,
              flex: 1,
              marginLeft: 6,
              lineHeight: 15,
              fontFamily: "DMSans_400Regular",
            }}
          >
            {t("payment.initiate.breakdown.escrowNote")}
          </AppText>
        </View>
      </View>

      {/* Method select */}
      <View
        style={[
          styles.card,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText style={styles.cardEyebrow(c)}>
          {t("payment.initiate.method.title")}
        </AppText>

        <Pressable
          onPress={() => setMethod("card")}
          style={[
            styles.methodCard,
            {
              borderColor: method === "card" ? c.orange : c.border,
              backgroundColor: method === "card" ? c.orangeDim : c.bgCard,
            },
          ]}
        >
          <FaCreditCard
            size={18}
            color={method === "card" ? c.orange : c.textDim}
          />
          <View style={{ flex: 1 }}>
            <AppText
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 13,
                fontWeight: "700",
                color: method === "card" ? c.orange : c.text,
              }}
            >
              {t("payment.initiate.method.card.title")}
            </AppText>
            <AppText
              style={{
                fontSize: 11,
                color: c.textMuted,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {t("payment.initiate.method.card.desc")}
            </AppText>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setMethod("crypto")}
          style={[
            styles.methodCard,
            {
              borderColor: method === "crypto" ? c.orange : c.border,
              backgroundColor: method === "crypto" ? c.orangeDim : c.bgCard,
            },
          ]}
        >
          <FaBitcoin
            size={18}
            color={method === "crypto" ? c.orange : c.textDim}
          />
          <View style={{ flex: 1 }}>
            <AppText
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 13,
                fontWeight: "700",
                color: method === "crypto" ? c.orange : c.text,
              }}
            >
              {t("payment.initiate.method.crypto.title")}
            </AppText>
            <AppText
              style={{
                fontSize: 11,
                color: c.textMuted,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {t("payment.initiate.method.crypto.desc")}
            </AppText>
          </View>
        </Pressable>

        {/* CryptoRateConverter — same as web, live rates + token cards */}
        {method === "crypto" ? (
          <View style={{ marginTop: 10 }}>
            <CryptoRateConverter
              fiatAmount={displayedTotal}
              fiatCurrency={currency || "NGN"}
              selectedToken={selectedCryptoToken}
              onAmountChange={(data) => {
                setSelectedCryptoToken(data.token);
                setConvertedCryptoAmount(data.amount);
              }}
            />
          </View>
        ) : null}

        {method === "card" ? (
          <View
            style={[
              styles.providerNote,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText
              style={{
                fontSize: 11,
                color: c.textDim,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {booking?.currency === "NGN"
                ? t("payment.initiate.method.card.paystackNote")
                : t("payment.initiate.method.card.flutterwaveNote")}
            </AppText>
          </View>
        ) : null}
      </View>

      {error ? (
        <View
          style={[
            styles.inlineError,
            { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
          ]}
        >
          <FaExclamationTriangle size={11} color={c.red} />
          <AppText
            style={{ fontSize: 12, color: c.red, flex: 1, marginLeft: 6 }}
          >
            {error}
          </AppText>
        </View>
      ) : null}

      <Pressable
        onPress={method === "card" ? handleCardPay : handleCryptoInitiate}
        disabled={paying}
        style={({ pressed }) => [
          styles.primaryBtn,
          {
            backgroundColor: paying ? c.bgCard : c.orange,
            opacity: paying ? 0.6 : pressed ? 0.9 : 1,
          },
        ]}
      >
        {paying ? (
          <ActivityIndicator color={c.bg} />
        ) : method === "card" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FaCreditCard size={14} color={c.bg} />
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 14,
                fontWeight: "800",
                color: c.bg,
              }}
            >
              {t("payment.initiate.actions.payCard", {
                amount: fmtMoney(displayedTotal, currency),
              })}
            </AppText>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FaBitcoin size={14} color={c.bg} />
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 14,
                fontWeight: "800",
                color: c.bg,
              }}
            >
              {t("payment.initiate.actions.payCrypto", {
                token: selectedCryptoToken,
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
          lineHeight: 15,
          fontFamily: "DMSans_400Regular",
        }}
      >
        {t("payment.initiate.disclaimer")}
      </AppText>
    </AppScreen>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────
function PreviewRow({ label, value, valueColor, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
        gap: 8,
      }}
    >
      <AppText
        style={{
          fontSize: 12,
          color: c.textDim,
          flex: 1,
          fontFamily: "DMSans_400Regular",
        }}
      >
        {label}
      </AppText>
      <AppText
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: valueColor || c.text,
          textAlign: "right",
          fontFamily: "DMSans_400Regular",
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

function MetaRow({ icon, label, value, mono, copyable, copied, onCopy, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 4,
      }}
    >
      {icon}
      {label ? (
        <AppText style={{ fontSize: 11, color: c.textMuted, minWidth: 60 }}>
          {label}
        </AppText>
      ) : null}
      <AppText
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: c.text,
          fontFamily: mono ? "monospace" : "DMSans_400Regular",
          flex: 1,
          textAlign: label ? "right" : "left",
        }}
        numberOfLines={2}
      >
        {value}
      </AppText>
      {copyable ? (
        <Pressable onPress={onCopy} hitSlop={8}>
          {copied ? (
            <FaCheck size={12} color={c.green} />
          ) : (
            <FaCopy size={12} color={c.textDim} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  topBack: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardEyebrow: (c) => ({
    fontSize: 10,
    fontWeight: "700",
    color: c.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 10,
    fontFamily: "Syne_700Bold",
  }),
  jobPostNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  pendingWrap: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  referralApplyBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  escrowNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  tokenRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tokenPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  providerNote: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: 10,
    marginBottom: 5,
    fontFamily: "Syne_700Bold",
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
});
