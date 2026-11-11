// src/screens/main/SubscriptionPlansScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import AppText from "../../components/AppText";
import AppScreen from "../../components/AppScreen";
import {
  getPlans,
  getMySubscription,
  createCheckout,
  cancelSubscription,
} from "../../api/subscriptions";
import {
  generateReceiptHTML,
  generatePrintableHTML,
} from "../../utils/receipt";

const ICONS = {
  checkCircle: "checkmark-circle",
  alertTriangle: "warning",
  close: "close",
  tag: "pricetag",
  check: "checkmark",
  download: "download-outline",
};

const INJECTED_BRIDGE = `
  (function() {
    if (!window.ReactNativeWebView) {
      window.ReactNativeWebView = {
        postMessage: function(msg) {
          window.__rnQueue = window.__rnQueue || [];
          window.__rnQueue.push(msg);
        }
      };
    }
    window.addEventListener('load', function() {
      if (window.__rnQueue && window.__rnQueue.length) {
        var q = window.__rnQueue.slice();
        window.__rnQueue = [];
        q.forEach(function(m) {
          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(m);
            }
          } catch(e) {}
        });
      }
    });
    true;
  })();
`;

function ErrorModal({ visible, title, message, onClose, c }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            s.modalBox,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[s.modalIcon, { backgroundColor: "rgba(239,68,68,0.15)" }]}
          >
            <Ionicons name={ICONS.alertTriangle} size={22} color={c.red} />
          </View>
          <AppText style={[s.modalTitle, { color: c.text }]}>{title}</AppText>
          <AppText style={[s.modalText, { color: c.textDim }]}>
            {message}
          </AppText>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              s.modalConfirmBtn,
              {
                backgroundColor: c.red,
                width: "100%",
                marginTop: 8,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <AppText style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
              Dismiss
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function SubscriptionPlansScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [receiptHtml, setReceiptHtml] = useState(null);

  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showError = (title, message) => {
    setErrorModal({ visible: true, title, message });
  };

  const closeError = () => {
    setErrorModal({ visible: false, title: "", message: "" });
  };

  const load = useCallback(async () => {
    if (!user?.role) return;
    setLoading(true);
    try {
      const [plansData, myData] = await Promise.all([
        getPlans(user.role),
        getMySubscription(),
      ]);
      setPlans(plansData);
      setCurrent(myData);
    } catch (err) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  function getDiscountedPrice(originalPrice) {
    if (!promoApplied || originalPrice === 0) return null;
    const { discountType, discountValue } = promoApplied;
    const discount =
      discountType === "PERCENT"
        ? parseFloat(((originalPrice * discountValue) / 100).toFixed(2))
        : Math.min(discountValue, originalPrice);
    const finalPrice = Math.max(0, originalPrice - discount);
    return { discount, finalPrice };
  }

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError("");
    setPromoSuccess("");

    try {
      const { data } = await import("../../api/client").then((m) =>
        m.default.get(`/subscriptions/promo/validate/${code}`),
      );
      const result = data.data;

      if (result.valid) {
        setPromoApplied({
          code: result.code,
          discountType: result.discountType,
          discountValue: result.discountValue,
          description: result.description,
          expiresAt: result.expiresAt,
        });
        const label =
          result.discountType === "PERCENT"
            ? t("subscription.promo.appliedPercent", {
                value: result.discountValue,
              })
            : t("subscription.promo.appliedFixed", {
                value: Number(result.discountValue).toLocaleString(),
              });
        setPromoSuccess(label);
        setPromoInput("");
      } else {
        setPromoError(t("subscription.promo.invalid"));
      }
    } catch (err) {
      setPromoError(
        err.response?.data?.message || t("subscription.promo.invalidOrExpired"),
      );
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoSuccess("");
    setPromoError("");
    setPromoInput("");
  };

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    setError("");

    try {
      const res = await createCheckout(planId);
      const url = res?.url;
      if (!url) {
        setError(t("subscription.errors.checkoutFailed"));
        setSubscribing(null);
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          t("subscription.errors.checkoutStartFailed"),
      );
      setSubscribing(null);
    }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    setError("");

    try {
      await cancelSubscription();
      setSuccess(t("subscription.success.cancelled"));
      const myRes = await getMySubscription();
      setCurrent(myRes);
      setShowCancelConfirm(false);
    } catch (err) {
      setError(
        err.response?.data?.message || t("subscription.errors.cancelFailed"),
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!current) return;

    const transaction = {
      reference:
        current.subscription?.reference || `SUB-${current.planId || "PLAN"}`,
      type: "SUBSCRIPTION",
      amount: current.plan?.price || 0,
      currency: current.plan?.currency || "NGN",
      status: "COMPLETED",
      createdAt: current.createdAt || new Date().toISOString(),
      completedAt: current.createdAt || new Date().toISOString(),
      description: `Subscription for ${current.plan?.name || "Plan"}`,
      fee: 0,
      netAmount: current.plan?.price || 0,
      meta: { paymentProvider: "Paystack" },
    };

    const html = generateReceiptHTML(transaction, th.mode === "dark");
    setReceiptHtml(html);
  };

  const handleWebViewMessage = async (event) => {
    const action = event?.nativeEvent?.data;
    if (action !== "download" && action !== "share") return;

    let pdfUri;

    try {
      if (!current) return;
      const transaction = {
        reference:
          current.subscription?.reference || `SUB-${current.planId || "PLAN"}`,
        type: "SUBSCRIPTION",
        amount: current.plan?.price || 0,
        currency: current.plan?.currency || "NGN",
        status: "COMPLETED",
        createdAt: current.createdAt || new Date().toISOString(),
        completedAt: current.createdAt || new Date().toISOString(),
        description: `Subscription for ${current.plan?.name || "Plan"}`,
        fee: 0,
        netAmount: current.plan?.price || 0,
        meta: { paymentProvider: "Paystack" },
      };

      const pdfHtml = generatePrintableHTML(transaction, th.mode === "dark");
      const result = await Print.printToFileAsync({ html: pdfHtml });
      pdfUri = result.uri;
    } catch (printError) {
      showError(
        "Print Failed",
        printError?.message || "Could not generate the PDF receipt.",
      );
      return;
    }

    try {
      if (action === "share") {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: "application/pdf",
            dialogTitle: "Share Receipt",
            UTI: "com.adobe.pdf",
          });
        } else {
          showError(
            "Sharing Unavailable",
            "Your device does not support sharing files.",
          );
        }
      }
    } catch (err) {
      showError(
        "Save Failed",
        err?.message || "Could not save or share the PDF receipt.",
      );
    }
  };

  return (
    <AppScreen
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
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <AppText
            variant="title"
            weight="displayBlack"
            style={{ fontSize: 15, color: c.text, letterSpacing: -0.5 }}
          >
            {t("subscription.title")}
          </AppText>
          <AppText style={[s.sub, { color: c.textDim }]}>
            {user?.role === "WORKER"
              ? t("subscription.subtitleWorker")
              : t("subscription.subtitleHirer")}
          </AppText>
        </View>
      </View>

      {/* ── Current plan banner ── */}
      {current && current.subscription?.tier !== "FREE" && (
        <View
          style={[
            s.currentBanner,
            { backgroundColor: c.greenDim, borderColor: c.green },
          ]}
        >
          <Ionicons name={ICONS.checkCircle} size={16} color={c.green} />
          <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
            <AppText style={[s.currentTitle, { color: c.text }]}>
              {t("subscription.currentBanner.active")}{" "}
              <AppText weight="bold">{current.plan?.name}</AppText>
            </AppText>
            {current.expiresAt && (
              <AppText style={[s.currentExpiry, { color: c.textDim }]}>
                {t("subscription.currentBanner.renews", {
                  date: new Date(current.expiresAt).toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  ),
                })}
              </AppText>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Pressable
              onPress={handleDownloadReceipt}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Ionicons name={ICONS.download} size={14} color={c.orange} />
              <AppText style={[s.cancelLink, { color: c.orange }]}>
                {" "}
                {t("subscription.currentBanner.receipt")}
              </AppText>
            </Pressable>
            <Pressable onPress={() => setShowCancelConfirm(true)}>
              <AppText style={[s.cancelLink, { color: c.red }]}>
                {t("subscription.currentBanner.cancel")}
              </AppText>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Error / Success ── */}
      {error ? (
        <View
          style={[
            s.errorBox,
            { backgroundColor: c.redDim, borderColor: c.red },
          ]}
        >
          <Ionicons name={ICONS.alertTriangle} size={14} color={c.red} />
          <AppText style={{ color: c.red, fontSize: 13, flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : null}
      {success ? (
        <View
          style={[
            s.successBox,
            { backgroundColor: c.greenDim, borderColor: c.green },
          ]}
        >
          <Ionicons name={ICONS.checkCircle} size={14} color={c.green} />
          <AppText style={{ color: c.green, fontSize: 13, flex: 1 }}>
            {success}
          </AppText>
        </View>
      ) : null}

      {/* ── Promo code ── */}
      <View style={s.promoSection}>
        {promoApplied ? (
          <View style={s.promoAppliedRow}>
            <View
              style={[
                s.promoTag,
                { backgroundColor: c.orangeDim, borderColor: c.orange },
              ]}
            >
              <Ionicons name={ICONS.tag} size={13} color={c.orange} />
              <AppText style={{ color: c.orange, fontSize: 12, marginLeft: 4 }}>
                <AppText weight="bold">{promoApplied.code}</AppText>
                {promoApplied.discountType === "PERCENT"
                  ? ` — ${promoApplied.discountValue}% off`
                  : ` — ₦${Number(promoApplied.discountValue).toLocaleString()} off`}
              </AppText>
            </View>
            <Pressable onPress={handleRemovePromo} style={s.promoRemoveBtn}>
              <Ionicons name={ICONS.close} size={12} color={c.textMuted} />
              <AppText
                style={{ color: c.textMuted, fontSize: 11, marginLeft: 4 }}
              >
                {t("subscription.promo.remove")}
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={s.promoInputRow}>
            <TextInput
              style={[
                s.promoInput,
                {
                  backgroundColor: c.bgPanel,
                  borderColor: c.border,
                  color: c.text,
                },
              ]}
              placeholder={t("subscription.promo.placeholder")}
              placeholderTextColor={c.textMuted}
              value={promoInput}
              onChangeText={(v) =>
                setPromoInput(v.toUpperCase().replace(/\s/g, ""))
              }
              maxLength={20}
              autoCapitalize="characters"
            />
            <Pressable
              style={[
                s.promoApplyBtn,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
              onPress={handleApplyPromo}
              disabled={!promoInput.trim() || promoLoading}
            >
              {promoLoading ? (
                <ActivityIndicator size="small" color={c.textDim} />
              ) : (
                <AppText
                  style={{ color: c.textDim, fontSize: 13, fontWeight: "700" }}
                >
                  {t("subscription.promo.apply")}
                </AppText>
              )}
            </Pressable>
          </View>
        )}
        {promoSuccess ? (
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
          >
            <Ionicons name={ICONS.check} size={12} color={c.green} />
            <AppText style={{ color: c.green, fontSize: 12, marginLeft: 4 }}>
              {promoSuccess}
            </AppText>
          </View>
        ) : null}
        {promoError ? (
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
          >
            <Ionicons name={ICONS.close} size={12} color={c.red} />
            <AppText style={{ color: c.red, fontSize: 12, marginLeft: 4 }}>
              {promoError}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* ── Plans grid ── */}
      {loading ? (
        <View style={s.plansGrid}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[s.skeleton, { backgroundColor: c.bgCard }]} />
          ))}
        </View>
      ) : (
        <View style={s.plansGrid}>
          {plans.map((plan) => {
            const isCurrent =
              current?.planId === plan.id ||
              (!current?.planId && current?.subscription?.tier === plan.tier);
            const isPopular = plan.popular;
            const discounted = getDiscountedPrice(plan.price);
            const isYearly =
              plan.billingCycle === "yearly" ||
              (typeof plan.id === "string" && plan.id.endsWith("_yearly"));

            return (
              <View
                key={plan.id}
                style={[
                  s.planCard,
                  {
                    backgroundColor: isPopular ? c.orangeDim : c.bgPanel,
                    borderColor: isPopular
                      ? c.orange
                      : isCurrent
                        ? c.green
                        : c.border,
                  },
                ]}
              >
                {isPopular && (
                  <View style={[s.popularBadge, { backgroundColor: c.orange }]}>
                    <AppText style={[s.badgeText, { color: c.bg }]}>
                      {t("subscription.plan.mostPopular")}
                    </AppText>
                  </View>
                )}
                {isCurrent && (
                  <View style={[s.currentBadge, { backgroundColor: c.green }]}>
                    <AppText style={[s.badgeText, { color: c.bg }]}>
                      {t("subscription.plan.currentPlan")}
                    </AppText>
                  </View>
                )}

                <AppText style={s.planTier}>{plan.tier}</AppText>
                <AppText
                  variant="title"
                  weight="displayBlack"
                  style={{
                    fontSize: 15,
                    color: c.text,
                    letterSpacing: -0.5,
                    marginBottom: 20,
                  }}
                >
                  {plan.name}
                </AppText>

                {/* ── Price Block ── */}
                <View style={s.planPriceWrap}>
                  {plan.price === 0 ? (
                    <AppText
                      weight="displayBlack"
                      style={[s.priceAmount, { color: c.orange }]}
                    >
                      {t("subscription.plan.free")}
                    </AppText>
                  ) : discounted ? (
                    <View style={s.priceDiscountWrap}>
                      <AppText style={s.priceStrike}>
                        {plan.currency} {plan.price.toLocaleString()}
                      </AppText>
                      <View style={s.priceRow}>
                        <AppText style={s.priceCurrency}>
                          {plan.currency}
                        </AppText>
                        <AppText
                          weight="displayBlack"
                          style={[s.priceAmount, { color: c.orange }]}
                        >
                          {discounted.finalPrice.toLocaleString()}
                        </AppText>
                        <AppText style={s.pricePer}>
                          /{isYearly ? "yr" : "mo"}
                        </AppText>
                      </View>
                      <View
                        style={[
                          s.savingsBadge,
                          { backgroundColor: c.orangeDim },
                        ]}
                      >
                        <AppText
                          style={{
                            color: c.orange,
                            fontSize: 10,
                            fontWeight: "800",
                          }}
                        >
                          Save ₦{discounted.discount.toLocaleString()}
                        </AppText>
                      </View>
                    </View>
                  ) : (
                    <View style={s.priceRow}>
                      <AppText style={s.priceCurrency}>{plan.currency}</AppText>
                      <AppText
                        weight="displayBlack"
                        style={[s.priceAmount, { color: c.orange }]}
                      >
                        {plan.price.toLocaleString()}
                      </AppText>
                      <AppText style={s.pricePer}>
                        /{isYearly ? "yr" : "mo"}
                      </AppText>
                    </View>
                  )}
                </View>

                <View style={s.featureList}>
                  {(plan.features || []).map((f, i) => (
                    <View key={i} style={s.featureItem}>
                      <Ionicons
                        name={ICONS.check}
                        size={14}
                        color={c.green}
                        style={{ marginTop: 2 }}
                      />
                      <AppText style={s.featureText}>{f}</AppText>
                    </View>
                  ))}
                </View>

                <Pressable
                  style={[
                    s.planBtn,
                    {
                      backgroundColor: isCurrent
                        ? c.greenDim
                        : isPopular
                          ? c.orange
                          : c.bgCard,
                      borderColor: isCurrent
                        ? c.green
                        : isPopular
                          ? c.orange
                          : c.border,
                      borderWidth: isPopular && !isCurrent ? 0 : 1,
                      opacity:
                        isCurrent || plan.price === 0 || subscribing === plan.id
                          ? 0.6
                          : 1,
                    },
                  ]}
                  onPress={() =>
                    !isCurrent && plan.price > 0 && handleSubscribe(plan.id)
                  }
                  disabled={
                    isCurrent || plan.price === 0 || subscribing === plan.id
                  }
                >
                  {subscribing === plan.id ? (
                    <ActivityIndicator
                      size="small"
                      color={isPopular ? c.bg : c.textDim}
                    />
                  ) : (
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: isCurrent
                          ? c.green
                          : isPopular
                            ? c.bg
                            : c.textDim,
                      }}
                    >
                      {isCurrent
                        ? t("subscription.plan.currentPlan")
                        : plan.price === 0
                          ? t("subscription.plan.freePlan")
                          : t("subscription.plan.upgradeTo", {
                              name: plan.name,
                            })}
                    </AppText>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <AppText style={[s.disclaimer, { color: c.textMuted }]}>
        {t("subscription.disclaimer")}
      </AppText>

      {/* ── Cancel confirmation modal ── */}
      <Modal
        visible={showCancelConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelConfirm(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setShowCancelConfirm(false)}
        >
          <Pressable
            style={[
              s.modalBox,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                s.modalIcon,
                { backgroundColor: "rgba(251,191,36,0.15)" },
              ]}
            >
              <Ionicons name={ICONS.alertTriangle} size={20} color="#fbbf24" />
            </View>
            <AppText
              weight="displayBlack"
              style={[s.modalTitle, { color: c.text }]}
            >
              {t("subscription.cancelModal.title")}
            </AppText>
            <AppText style={[s.modalText, { color: c.textDim }]}>
              {t("subscription.cancelModal.body")}
            </AppText>
            <View style={s.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  s.modalCancelBtn,
                  { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => setShowCancelConfirm(false)}
                disabled={cancelling}
              >
                <AppText
                  style={{ color: c.textDim, fontSize: 13, fontWeight: "600" }}
                >
                  {t("subscription.cancelModal.keep")}
                </AppText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  s.modalConfirmBtn,
                  { backgroundColor: c.red, opacity: pressed ? 0.88 : 1 },
                ]}
                onPress={confirmCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <AppText
                    style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}
                  >
                    {t("subscription.cancelModal.confirm")}
                  </AppText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Receipt modal (WebView) ── */}
      <Modal
        visible={!!receiptHtml}
        animationType="slide"
        onRequestClose={() => setReceiptHtml(null)}
      >
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 50,
              paddingHorizontal: 16,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              backgroundColor: c.bgPanel,
            }}
          >
            <AppText weight="bold" style={{ fontSize: 16, color: c.text }}>
              {t("subscription.receipt.modalTitle")}
            </AppText>
            <Pressable onPress={() => setReceiptHtml(null)} hitSlop={10}>
              <Ionicons name="close" size={24} color={c.text} />
            </Pressable>
          </View>
          {receiptHtml ? (
            <WebView
              source={{ html: receiptHtml }}
              style={{ flex: 1 }}
              originWhitelist={["*"]}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={handleWebViewMessage}
              injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE}
            />
          ) : null}
        </View>
      </Modal>

      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeError}
        c={c}
      />
    </AppScreen>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    lineHeight: 19,
  },
  currentBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    gap: 6,
  },
  currentTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  currentExpiry: {
    fontSize: 11,
    marginTop: 2,
  },
  cancelLink: {
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  promoSection: {
    marginBottom: 24,
  },
  promoInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  promoInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 8,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  promoApplyBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  promoAppliedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  promoTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 8,
  },
  promoRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  plansGrid: {
    gap: 20,
    marginBottom: 20,
  },
  skeleton: {
    height: 400,
    borderRadius: 16,
    opacity: 0.5,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 26,
    paddingHorizontal: 22,
    position: "relative",
    alignItems: "flex-start",
    overflow: "visible",
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: [{ translateX: -50 }],
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 100,
  },
  currentBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: [{ translateX: -50 }],
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  planTier: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#9ca3af",
    marginBottom: 6,
  },
  planName: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 16,
  },
  planPriceWrap: {
    width: "100%",
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  priceCurrency: {
    fontSize: 12,
    color: "#9ca3af",
  },
  priceAmount: {
    fontSize: 20,
    letterSpacing: -0.6,
  },
  pricePer: {
    fontSize: 11,
    color: "#9ca3af",
  },
  priceDiscountWrap: {
    width: "100%",
  },
  priceStrike: {
    fontSize: 12,
    color: "#9ca3af",
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  savingsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 100,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  featureList: {
    flex: 1,
    width: "100%",
    marginBottom: 22,
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: "#9ca3af",
    flex: 1,
    lineHeight: 18,
  },
  planBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  modalText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 21,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
