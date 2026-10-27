// src/screens/main/InitiatePaymentScreen.js
//
// Verbatim port of components/payment/InitiatePayment.jsx.
//
// Four render branches (in this order):
//   1. loading               → <PageSkeleton variant="form" />
//   2. error && !booking     → error card
//   3. bookingStatus PENDING → polling "Waiting for Worker" card
//   4. default               → method-selection form
//
// Navigate here from BookingDetail with { bookingId } as route params.
// On successful card checkout, `Linking.openURL(paystackUrl)` opens the
// device browser; the backend returns the user to the app via the
// callbackUrl you pass (set to a deep link in the app, or leave blank and
// let the user return manually).

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import { calcPricing, getHirerFeeRate } from "../../utils/pricing";
import {
  FaArrowLeft,
  FaCreditCard,
  FaBitcoin,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaShieldAlt,
  FaUser,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaGift,
  FaBriefcase,
} from "../../icons/fa";

import PaymentOptions from "../../components/booking/PaymentOptions";
import { ReferralSlider } from "../../components/booking/BookingDetailPayment";

// ── Helpers ────────────────────────────────────────────────────────────
function fmtMoney(amount, currency = "NGN") {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const METHODS = [
  {
    id: "card",
    icon: "card",
    label: "Card / Mobile Money",
    desc: "Redirected to Flutterwave or Paystack",
  },
  {
    id: "crypto",
    icon: "bitcoin",
    label: "Crypto",
    desc: "USDC · USDT · BTC · ETH",
  },
];

// ── Screen ─────────────────────────────────────────────────────────────
export default function InitiatePaymentScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;

  const bookingId = route.params?.bookingId;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("card");
  const [bookingStatus, setBookingStatus] = useState(null);

  const [walletBalance, setWalletBalance] = useState(0);
  const [referralPercent, setReferralPercent] = useState(0);
  const [referralAmount, setReferralAmount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);

  const pollRef = useRef(null);

  // ── Fetch booking on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    client
      .get(`/bookings/${bookingId}`)
      .then((res) => {
        const b = res.data?.data?.booking || res.data?.data || null;
        setBooking(b);
        setBookingStatus(b?.status ?? null);
      })
      .catch(() => setError("Could not load booking details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // ── Fetch referral wallet ───────────────────────────────────────────
  useEffect(() => {
    if (!booking) return;
    client
      .get("/referral/wallet")
      .then((res) => setWalletBalance(Number(res.data?.data?.balance) || 0))
      .catch(() => {});
  }, [booking]);

  // ── Poll while PENDING ──────────────────────────────────────────────
  useEffect(() => {
    if (bookingStatus !== "PENDING") return;
    pollRef.current = setInterval(() => {
      client
        .get(`/bookings/${bookingId}`)
        .then((res) => {
          const b = res.data?.data?.booking || res.data?.data || null;
          setBooking(b);
          setBookingStatus(b?.status ?? null);
        })
        .catch(() => {});
    }, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [bookingId, bookingStatus]);

  // ── Pricing ─────────────────────────────────────────────────────────
  const p = booking ? calcPricing(booking) : null;
  const isJobPostBooking = booking?.source === "JOB_POST";

  const handlePercentChange = useCallback(
    (pct) => {
      if (!p) return;
      const subtotal = p.subtotal || 0;
      const maxDiscount = Math.min(subtotal, walletBalance);
      const amount = Math.round((pct / 100) * subtotal);
      const final = Math.min(amount, maxDiscount);
      setReferralPercent(pct);
      setReferralAmount(final);
      setReferralApplied(final > 0);
    },
    [p, walletBalance],
  );

  const handleReferralToggle = () => {
    if (referralAmount === 0) return;
    setReferralApplied((v) => !v);
  };

  // ── Card payment ────────────────────────────────────────────────────
  async function handleCardPay() {
    setPaying(true);
    setError("");
    try {
      const res = await client.post(`/payments/initiate/${bookingId}`, {
        referralAmount: referralApplied ? referralAmount : 0,
      });
      const data = res.data?.data || res.data || {};

      // Already paid
      if (data.alreadyPaid) {
        toast.info("Payment already in escrow.");
        return;
      }

      // Paystack
      if (data.authorizationUrl) {
        await Linking.openURL(data.authorizationUrl);
        return;
      }

      // Stripe Checkout — create a session and open it
      if (data.clientSecret) {
        const checkout = await client.post(
          `/payments/initiate-checkout/${bookingId}`,
          {
            referralAmount: referralApplied ? referralAmount : 0,
          },
        );
        const url = checkout.data?.data?.url;
        if (url) await Linking.openURL(url);
        return;
      }

      toast.error("Payment URL not received. Try again.");
    } catch (e) {
      setError(e?.response?.data?.message || "Payment initiation failed.");
    } finally {
      setPaying(false);
    }
  }

  // ── Method dispatch ─────────────────────────────────────────────────
  function handlePrimary() {
    if (method === "card") return handleCardPay();
    // Crypto is handled inline by <PaymentOptions> further down.
    toast.info("Choose a crypto asset to continue below.");
  }

  // ── Guards ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <PageSkeleton variant="form" />
      </View>
    );
  }

  if (error && !booking) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <FaExclamationTriangle size={40} color={c.red} />
        <AppText style={{ fontSize: 14, color: c.textDim, marginTop: 12 }}>
          {error}
        </AppText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { borderColor: c.border, marginTop: 16 }]}
        >
          <FaArrowLeft size={12} color={c.textDim} />
          <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
            Back to Bookings
          </AppText>
        </Pressable>
      </View>
    );
  }

  // ── PENDING state ───────────────────────────────────────────────────
  if (bookingStatus === "PENDING") {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back + badge */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backLink}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText style={{ fontSize: 13, color: c.textDim, marginLeft: 4 }}>
              View Booking
            </AppText>
          </Pressable>
          <View
            style={[
              styles.payBadge,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            <AppText
              style={{ fontSize: 10, fontWeight: "700", color: c.orange }}
            >
              ⏳ Pending Acceptance
            </AppText>
          </View>
        </View>

        {/* Summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "600",
              color: c.textMuted,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Booking created
          </AppText>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: c.text,
              marginTop: 4,
            }}
          >
            {booking?.title}
          </AppText>
          <AppText
            style={{
              fontSize: 12,
              color: c.orange,
              fontWeight: "600",
              marginTop: 2,
            }}
          >
            {booking?.worker?.firstName} {booking?.worker?.lastName} ·{" "}
            {booking?.category?.name}
          </AppText>
        </View>

        {/* Preview breakdown */}
        <View
          style={[
            styles.breakdownCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: c.textMuted,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            Payment Preview
          </AppText>
          {renderBreakdownRows(
            p,
            isJobPostBooking,
            booking,
            referralApplied,
            referralAmount,
            c,
          )}
        </View>

        {/* Waiting spinner */}
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <ActivityIndicator color="#eab308" size="large" />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: "#eab308",
              marginTop: 12,
            }}
          >
            Waiting for Worker
          </AppText>
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              marginTop: 6,
              textAlign: "center",
              maxWidth: 300,
              lineHeight: 18,
            }}
          >
            Once they accept, you'll be able to complete payment here. This page
            checks every 8 seconds.
          </AppText>
        </View>

        <Pressable
          onPress={async () => {
            try {
              const r = await client.get(`/bookings/${bookingId}`);
              const b = r.data?.data?.booking || r.data?.data || null;
              setBooking(b);
              setBookingStatus(b?.status ?? null);
            } catch {}
          }}
          style={({ pressed }) => [
            styles.payBtn,
            {
              backgroundColor: c.bgCard,
              borderWidth: 1,
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText
            style={{ fontSize: 13, fontWeight: "700", color: c.textDim }}
          >
            🔄 Check for Updates
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          style={{ paddingVertical: 12, alignItems: "center" }}
        >
          <AppText
            style={{
              fontSize: 12,
              color: c.textMuted,
              textDecorationLine: "underline",
            }}
          >
            View booking details while you wait →
          </AppText>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Main method selection ───────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Back + Secure badge */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <FaArrowLeft size={12} color={c.textDim} />
          <AppText style={{ fontSize: 13, color: c.textDim, marginLeft: 4 }}>
            Back to Booking
          </AppText>
        </Pressable>
        <View
          style={[
            styles.payBadge,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          <FaLock size={10} color={c.orange} />
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: c.orange,
              marginLeft: 4,
            }}
          >
            Secure Payment
          </AppText>
        </View>
      </View>

      {/* Summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "600",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          You're paying for
        </AppText>
        <AppText
          style={{
            fontFamily: "Syne_800ExtraBold",
            fontSize: 18,
            fontWeight: "800",
            color: c.text,
            marginTop: 4,
          }}
        >
          {booking?.title}
        </AppText>
        <AppText
          style={{
            fontSize: 12,
            color: c.orange,
            fontWeight: "600",
            marginTop: 2,
          }}
        >
          {booking?.category?.name}
        </AppText>

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
            <FaBriefcase size={12} color="#818cf8" style={{ marginTop: 1 }} />
            <View style={{ flex: 1, marginLeft: 6 }}>
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#818cf8",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                From Job Post
              </AppText>
              <AppText
                style={{
                  fontSize: 11,
                  color: c.textDim,
                  marginTop: 2,
                  lineHeight: 16,
                }}
              >
                This booking was created from a job post. The final amount is
                the rate you selected on the booking creation page.
              </AppText>
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 12, gap: 6 }}>
          <MetaRow
            icon={<FaUser size={12} color={c.textDim} />}
            text={`${booking?.worker?.firstName} ${booking?.worker?.lastName}`}
            c={c}
          />
          <MetaRow
            icon={<FaCalendarAlt size={12} color={c.textDim} />}
            text={new Date(booking?.scheduledAt).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            c={c}
          />
          {booking?.address ? (
            <MetaRow
              icon={<FaMapMarkerAlt size={12} color={c.textDim} />}
              text={booking.address}
              c={c}
            />
          ) : null}
        </View>
      </View>

      {/* Referral slider — NGN only, wallet > 0 */}
      {walletBalance > 0 && booking?.currency === "NGN" ? (
        <View
          style={[
            styles.referralBox,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <FaGift size={13} color={c.green} />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: c.text,
                flex: 1,
              }}
            >
              Referral Wallet Balance: {fmtMoney(walletBalance, "NGN")}
            </AppText>
          </View>
          <ReferralSlider
            value={referralPercent}
            onChange={handlePercentChange}
            disabled={walletBalance <= 0}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: c.orange,
                minWidth: 44,
              }}
            >
              {referralPercent}%
            </AppText>
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: c.text,
                flex: 1,
                textAlign: "right",
              }}
            >
              {fmtMoney(referralAmount, "NGN")}
            </AppText>
            <Pressable
              onPress={handleReferralToggle}
              disabled={referralAmount === 0}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: referralApplied ? c.orange : c.border,
                  backgroundColor: referralApplied ? c.orange : c.bgCard,
                  opacity: referralAmount === 0 ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: referralApplied ? "#fff" : c.textDim,
                }}
              >
                {referralApplied ? "Remove" : "Apply"}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Breakdown */}
      <View
        style={[
          styles.breakdownCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          Payment Breakdown
        </AppText>
        {renderBreakdownRows(
          p,
          isJobPostBooking,
          booking,
          referralApplied,
          referralAmount,
          c,
        )}

        <View
          style={[
            styles.escrowNote,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          <FaShieldAlt size={12} color={c.orange} style={{ marginTop: 1 }} />
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              flex: 1,
              marginLeft: 6,
              lineHeight: 17,
            }}
          >
            Funds are held in escrow and only released to the worker after you
            confirm the job is complete.
          </AppText>
        </View>
      </View>

      {/* Method selection */}
      <View
        style={[
          styles.breakdownCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          Payment Method
        </AppText>

        {METHODS.map((m) => {
          const active = method === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMethod(m.id)}
              style={({ pressed }) => [
                styles.methodCard,
                {
                  borderColor: active ? c.orange : c.border,
                  backgroundColor: active ? c.orangeDim : c.bgCard,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={{ width: 32 }}>
                {m.id === "card" ? (
                  <FaCreditCard
                    size={18}
                    color={active ? c.orange : c.textDim}
                  />
                ) : (
                  <FaBitcoin size={18} color={active ? c.orange : c.textDim} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: active ? c.orange : c.text,
                  }}
                >
                  {m.label}
                </AppText>
                <AppText
                  style={{ fontSize: 11, color: c.textMuted, marginTop: 1 }}
                >
                  {m.desc}
                </AppText>
              </View>
            </Pressable>
          );
        })}

        {/* Card note */}
        {method === "card" ? (
          <View
            style={{
              marginTop: 10,
              padding: 9,
              borderRadius: 8,
              backgroundColor: c.bgCard,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <AppText style={{ fontSize: 12, color: c.textDim, lineHeight: 17 }}>
              {booking?.currency === "NGN"
                ? "💚 You'll be redirected to Paystack to pay securely in NGN."
                : "🦋 You'll be redirected to Flutterwave to pay securely."}
            </AppText>
          </View>
        ) : null}

        {/* Crypto options — full flow delegated to <PaymentOptions> */}
        {method === "crypto" ? (
          <View style={{ marginTop: 10 }}>
            <PaymentOptions
              booking={booking}
              referralAmount={referralApplied ? referralAmount : 0}
              referralApplied={referralApplied}
              onReferralToggle={handleReferralToggle}
              onSuccess={() => {
                toast.success("Crypto payment submitted.");
                navigation.goBack();
              }}
            />
          </View>
        ) : null}
      </View>

      {/* Error */}
      {error ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
          ]}
        >
          <FaExclamationTriangle size={12} color={c.red} />
          <AppText
            style={{ fontSize: 12, color: c.red, marginLeft: 6, flex: 1 }}
          >
            {error}
          </AppText>
        </View>
      ) : null}

      {/* Primary CTA — only for card (crypto has its own button inside <PaymentOptions>) */}
      {method === "card" ? (
        <Pressable
          onPress={handlePrimary}
          disabled={paying}
          style={({ pressed }) => [
            styles.payBtn,
            {
              backgroundColor: paying ? c.bgCard : c.orange,
              opacity: paying ? 0.7 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <FaCreditCard size={13} color="#fff" />
              <AppText
                style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}
              >
                Pay{" "}
                {fmtMoney(
                  p?.grossTotal - (referralApplied ? referralAmount : 0),
                  p?.currency,
                )}{" "}
                Securely
              </AppText>
            </View>
          )}
        </Pressable>
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
        Powered by Flutterwave & Paystack · Escrow protected · Refund policy
        applies
      </AppText>

      {/* Trust row */}
      <View style={styles.trustRow}>
        <AppText style={[styles.trustItem, { color: c.textMuted }]}>
          🔒 256-bit SSL
        </AppText>
        <AppText style={[styles.trustItem, { color: c.textMuted }]}>
          🛡️ Escrow protected
        </AppText>
        <AppText style={[styles.trustItem, { color: c.textMuted }]}>
          🦋 Flutterwave
        </AppText>
        <AppText style={[styles.trustItem, { color: c.textMuted }]}>
          💚 Paystack
        </AppText>
      </View>
    </ScrollView>
  );
}

// ── Helper: breakdown rows (shared by PENDING and default branches) ───
function renderBreakdownRows(
  p,
  isJobPostBooking,
  booking,
  referralApplied,
  referralAmount,
  c,
) {
  if (!p) return null;
  const currency = p.currency || booking?.currency || "NGN";
  const feePct = Math.round(getHirerFeeRate(currency) * 100);

  return (
    <View style={{ gap: 6 }}>
      <BR
        label={isJobPostBooking ? "Agreed Total" : "Agreed Rate"}
        value={`${fmtMoney(p.agreedRate, currency)}${!isJobPostBooking ? p.unitSuffix || "" : ""}`}
        c={c}
      />
      {isJobPostBooking && booking?.estimatedValue ? (
        <BR
          label="Duration"
          value={`${booking.estimatedValue} ${booking.estimatedUnit || "hours"}${
            booking.estimatedHours ? ` (≈ ${booking.estimatedHours}h)` : ""
          }`}
          c={c}
        />
      ) : null}
      {!isJobPostBooking && p.hasQty ? (
        <>
          <BR
            label="Duration"
            value={`${p.qty} ${p.unitLabel}${p.qty !== 1 ? "s" : ""}`}
            c={c}
          />
          <BR
            label={`Job Value (${p.qty} × ${fmtMoney(p.agreedRate, currency)})`}
            value={fmtMoney(p.subtotal, currency)}
            c={c}
          />
        </>
      ) : null}
      <BR
        label={`Service Fee (${feePct}%)`}
        value={`+ ${fmtMoney(p.hirerFee, currency)}`}
        c={c}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <FaCheckCircle size={10} color={c.green} />
          <AppText style={{ fontSize: 11, color: c.green }}>
            Worker receives (no fee)
          </AppText>
        </View>
        <AppText style={{ fontSize: 12, color: c.green, fontWeight: "600" }}>
          {fmtMoney(p.workerPayout, currency)}
        </AppText>
      </View>
      {referralApplied && referralAmount > 0 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <FaGift size={10} color={c.green} />
            <AppText style={{ fontSize: 11, color: c.green }}>
              Referral bonus
            </AppText>
          </View>
          <AppText style={{ fontSize: 12, color: c.green, fontWeight: "600" }}>
            − {fmtMoney(referralAmount, currency)}
          </AppText>
        </View>
      ) : null}
      <View
        style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
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
          {fmtMoney(
            p.grossTotal - (referralApplied ? referralAmount : 0),
            currency,
          )}
        </AppText>
      </View>
    </View>
  );
}

function BR({ label, value, c }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <AppText style={{ fontSize: 12, color: c.textDim, flexShrink: 1 }}>
        {label}
      </AppText>
      <AppText
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: c.text,
          textAlign: "right",
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

function MetaRow({ icon, text, c }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {icon}
      <AppText
        style={{ fontSize: 12, color: c.textDim, flex: 1 }}
        numberOfLines={1}
      >
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  backLink: { flexDirection: "row", alignItems: "center" },
  payBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  jobPostNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  referralBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  breakdownCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  escrowNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  payBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingTop: 4,
  },
  trustItem: {
    fontSize: 11,
    fontWeight: "500",
  },
});
