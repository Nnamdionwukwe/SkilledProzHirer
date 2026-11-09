// src/components/RetainedStaff/PayCycleModal.js
//
// Ported verbatim from src/pages/hirer/retained-staff/PayCycleModal.jsx
// + HirerCycleDetail.module.css (modal section).
//
// Two providers: card (redirects to booking pay flow) and wallet
// (deducts from balance + shows success modal).

import React, { useEffect, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { retainedStaffApi } from "../../api/retainedStaff";
import client from "../../api/client";
import PaymentSuccessModal from "./PaymentSuccessModal";

export default function PayCycleModal({ isOpen, onClose, cycle, member }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isNarrow = width < 420;

  const [provider, setProvider] = useState("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paidCycleId, setPaidCycleId] = useState(null);

  const currency = cycle?.currency || member?.currency || "NGN";
  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  useEffect(() => {
    if (!isOpen) return;
    setLoadingWallet(true);
    client
      .get("/wallet/balance", { params: { currency } })
      .then((res) => setWalletBalance(res.data?.data?.balance ?? 0))
      .catch(() => setWalletBalance(0))
      .finally(() => setLoadingWallet(false));
  }, [isOpen, currency]);

  if (!isOpen) return null;

  const totalToPay = cycle?.netAmount || 0;
  const hasEnoughBalance =
    walletBalance !== null && walletBalance >= totalToPay;

  const PROVIDERS = [
    {
      key: "card",
      label: t("retainedStaff.payCardLabel"),
      desc: t("retainedStaff.payCardDesc"),
      icon: "card-outline",
      disabled: false,
    },
    {
      key: "wallet",
      label: t("retainedStaff.payWalletLabel"),
      desc: loadingWallet
        ? t("retainedStaff.loadingBalance")
        : walletBalance === null
          ? t("retainedStaff.walletUnavailable")
          : hasEnoughBalance
            ? t("retainedStaff.walletAvailable", {
                currency,
                amount: walletBalance.toLocaleString(),
              })
            : t("retainedStaff.walletInsufficient", {
                currency,
                amount: walletBalance?.toLocaleString() || 0,
              }),
      icon: "cash-outline",
      disabled: !hasEnoughBalance && !loadingWallet,
    },
  ];

  const handlePay = async () => {
    setError("");
    if (provider === "wallet" && !hasEnoughBalance) {
      setError(t("retainedStaff.walletInsufficientError", { currency }));
      return;
    }
    setLoading(true);
    try {
      const payRes = await retainedStaffApi.payCycle(member.id, cycle.id, {
        paymentMethod: "ESCROW",
        provider,
      });
      const bookingId = payRes.data?.data?.booking?.id;
      const returnedCycleId = payRes.data?.data?.cycleId;

      if (provider === "wallet") {
        await client.post(`/payments/wallet/${bookingId}`);
        setPaidCycleId(returnedCycleId);
        setShowSuccess(true);
      } else {
        navigation.navigate("InitiatePayment", {
          bookingId: cycle.bookingId, // or cycle.booking?.id
        });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t("retainedStaff.payFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <PaymentSuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onClose?.();
        }}
        onViewCycle={() => {
          setShowSuccess(false);
          onClose?.();
          navigation.navigate("RetainedStaffCycleDetail", {
            id: member.id,
            cycleId: paidCycleId,
            payment: "success",
          });
        }}
      />
    );
  }

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlayRoot}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.75)" },
          ]}
        />
        <View style={styles.kav}>
          <View
            style={[
              styles.modal,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View style={[styles.header, { borderBottomColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontFamily:
                      theme.fonts?.displayBlack || "Syne_800ExtraBold",
                    fontSize: rem(1.25),
                    lineHeight: rem(1.25) * 1.15,
                    fontWeight: "800",
                    color: c.text,
                  }}
                >
                  {t("retainedStaff.payCycleTitle")}
                </AppText>
                <AppText
                  numberOfLines={2}
                  style={{
                    fontFamily: theme.fonts?.body || "DMSans_400Regular",
                    fontSize: rem(0.8),
                    lineHeight: rem(0.8) * 1.35,
                    color: c.textDim,
                    marginTop: 4,
                  }}
                >
                  {cycle?.label || "—"} · {member?.worker?.firstName}{" "}
                  {member?.worker?.lastName}
                </AppText>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.textDim} />
              </Pressable>
            </View>

            {error ? (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: c.redDim,
                    borderColor: "rgba(239,68,68,0.3)",
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={16} color={c.red} />
                <AppText
                  style={{
                    flex: 1,
                    fontFamily:
                      theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                    fontSize: rem(0.85),
                    fontWeight: "600",
                    color: c.red,
                    marginLeft: 6,
                  }}
                >
                  {error}
                </AppText>
              </View>
            ) : null}

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
              <View
                style={[
                  styles.paySummary,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <SummaryRow
                  label={t("retainedStaff.baseAmountShort")}
                  value={`${currency} ${(cycle?.baseAmount || 0).toLocaleString()}`}
                  theme={theme}
                  rem={rem}
                />
                {cycle?.bonusAmount > 0 ? (
                  <SummaryRow
                    label={t("retainedStaff.bonusShort")}
                    value={`+ ${currency} ${cycle.bonusAmount.toLocaleString()}`}
                    theme={theme}
                    rem={rem}
                  />
                ) : null}
                {cycle?.deductionAmount > 0 ? (
                  <SummaryRow
                    label={t("retainedStaff.deductionsShort")}
                    value={`− ${currency} ${cycle.deductionAmount.toLocaleString()}`}
                    theme={theme}
                    rem={rem}
                  />
                ) : null}
                <SummaryRow
                  label={t("retainedStaff.platformFee")}
                  value={`− ${currency} ${(cycle?.platformFee || 0).toLocaleString()}`}
                  theme={theme}
                  rem={rem}
                />
                <View
                  style={[
                    styles.paySummaryTotalRow,
                    { borderTopColor: c.border },
                  ]}
                >
                  <AppText
                    style={{
                      fontFamily: theme.fonts?.display || "Syne_700Bold",
                      fontSize: rem(1.1),
                      fontWeight: "800",
                      color: c.text,
                    }}
                  >
                    {t("retainedStaff.totalToPay")}
                  </AppText>
                  <AppText
                    style={{
                      fontFamily:
                        theme.fonts?.displayBlack || "Syne_800ExtraBold",
                      fontSize: rem(1.1),
                      fontWeight: "800",
                      color: c.orange,
                    }}
                  >
                    {currency} {(cycle?.netAmount || 0).toLocaleString()}
                  </AppText>
                </View>
              </View>

              <AppText
                style={{
                  fontFamily: theme.fonts?.display || "Syne_700Bold",
                  fontSize: rem(0.85),
                  fontWeight: "700",
                  color: c.textDim,
                  textTransform: "uppercase",
                  letterSpacing: 0.06 * rem(0.85),
                  marginTop: 8,
                  marginBottom: 12,
                }}
              >
                {t("retainedStaff.choosePaymentMethod")}
              </AppText>

              <View style={{ gap: 8 }}>
                {PROVIDERS.map((p) => {
                  const isSelected = provider === p.key;
                  return (
                    <Pressable
                      key={p.key}
                      disabled={p.disabled || loadingWallet}
                      onPress={() => setProvider(p.key)}
                      style={({ pressed }) => [
                        styles.providerCard,
                        {
                          borderColor: isSelected ? c.orange : c.border,
                          backgroundColor: isSelected ? c.orangeDim : c.bgInput,
                          opacity: p.disabled ? 0.6 : pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.providerIcon,
                          {
                            backgroundColor: isSelected ? c.orange : c.bgCard,
                          },
                        ]}
                      >
                        <Ionicons
                          name={p.icon}
                          size={20}
                          color={isSelected ? "#fff" : c.textDim}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.bodyBold || "DMSans_700Bold",
                            fontSize: rem(0.9),
                            fontWeight: "700",
                            color: c.text,
                          }}
                        >
                          {p.label}
                        </AppText>
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.body || "DMSans_400Regular",
                            fontSize: rem(0.75),
                            lineHeight: rem(0.75) * 1.4,
                            color:
                              p.key === "wallet" &&
                              !hasEnoughBalance &&
                              !loadingWallet
                                ? c.red
                                : c.textDim,
                            marginTop: 2,
                          }}
                        >
                          {p.desc}
                        </AppText>
                      </View>
                      <View
                        style={[
                          styles.radio,
                          {
                            borderColor: isSelected ? c.orange : c.border,
                            backgroundColor: isSelected
                              ? c.orange
                              : "transparent",
                          },
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#fff"
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: c.border }]}>
              <Pressable
                onPress={onClose}
                disabled={loading}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    borderColor: pressed ? c.borderHover : c.border,
                    opacity: loading ? 0.5 : 1,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontFamily:
                      theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                    fontSize: rem(0.85),
                    fontWeight: "600",
                    color: c.textDim,
                  }}
                >
                  {t("retainedStaff.cancelBtn")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={handlePay}
                disabled={
                  loading ||
                  (provider === "wallet" && !hasEnoughBalance) ||
                  loadingWallet
                }
                style={({ pressed }) => [
                  styles.payBtn,
                  {
                    backgroundColor: pressed ? c.orangeHover : c.orange,
                    opacity:
                      loading ||
                      (provider === "wallet" && !hasEnoughBalance) ||
                      loadingWallet
                        ? 0.6
                        : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="card-outline" size={18} color="#fff" />
                )}
                <AppText
                  style={{
                    fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                    fontSize: rem(0.85),
                    fontWeight: "700",
                    color: "#fff",
                    marginLeft: 6,
                  }}
                >
                  {loading
                    ? t("retainedStaff.processing")
                    : t("retainedStaff.continueToPayment")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value, theme, rem }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <AppText
        style={{
          fontFamily: theme.fonts?.body || "DMSans_400Regular",
          fontSize: rem(0.85),
          color: theme.colors.textDim,
        }}
      >
        {label}
      </AppText>
      <AppText
        style={{
          fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
          fontSize: rem(0.85),
          fontWeight: "600",
          color: theme.colors.text,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: { flex: 1 },
  kav: { flex: 1, justifyContent: "center", padding: 16 },
  modal: {
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
    maxWidth: 600,
    height: "90%",
    alignSelf: "center",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginTop: 16,
  },
  body: { padding: 24, paddingTop: 16 },
  paySummary: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  paySummaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
