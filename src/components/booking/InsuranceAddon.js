// src/components/booking/InsuranceAddon.js
//
// Verbatim port of components/hirer/InsuranceAddon.jsx.
//
// Fetches GET /insurance/plans on mount (cached on backend).
// On "Pay & Activate": POST /insurance/checkout with { planId, bookingId },
// backend returns { url, sessionId } and we open the URL in the device
// browser via Linking.openURL. After payment, the checkout provider
// redirects back to a deep link, and the booking refetch shows the
// insurance activated (booking.insuranceRef != null).
//
// States:
//   · Already insured (booking.insuranceRef) → green "Insured: {plan}" pill
//   · Otherwise                              → collapsible panel with plan cards
//
// No mobile-specific swaps needed except:
//   · window.location.href = res.data.data.url → Linking.openURL(url)

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaShieldAlt,
  FaChevronUp,
  FaChevronDown,
  FaCheck,
  FaExclamationTriangle,
} from "../../icons/fa";

export default function InsuranceAddon({ bookingId, booking, onPurchased }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const isInsured = !!booking?.insuranceRef;

  // ── Fetch plans on mount ────────────────────────────────────────────
  useEffect(() => {
    client
      .get("/insurance/plans")
      .then((res) => setPlans(res?.data?.data?.plans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Checkout ────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!selected) return;
    setPurchasing(true);
    setError("");
    try {
      const res = await client.post("/insurance/checkout", {
        planId: selected,
        bookingId: bookingId || null,
      });
      const url = res?.data?.data?.url;
      if (url) {
        await Linking.openURL(url);
        onPurchased?.();
      } else {
        setError("Checkout URL missing. Try again.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Checkout failed.");
    } finally {
      setPurchasing(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selected);

  // ═════════════════════════════════════════════════════════════════════
  // ALREADY INSURED
  // ═════════════════════════════════════════════════════════════════════
  if (isInsured) {
    return (
      <View
        style={[
          styles.insuredBadge,
          { backgroundColor: c.greenDim, borderColor: c.green },
        ]}
      >
        <FaShieldAlt size={18} color={c.green} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: c.green,
            }}
          >
            Insured: {booking.insurancePlan || "Active"}
          </AppText>
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              fontFamily: "monospace",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            Ref: {booking.insuranceRef}
          </AppText>
        </View>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // NOT INSURED — collapsible
  // ═════════════════════════════════════════════════════════════════════
  return (
    <View>
      {/* Trigger */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: c.bgPanel,
            borderColor: c.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <FaShieldAlt size={18} color={c.orange} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
            Add Insurance Cover (Optional)
          </AppText>
          <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>
            Protect your property — charged in USD
          </AppText>
        </View>
        {open ? (
          <FaChevronUp size={12} color={c.textMuted} />
        ) : (
          <FaChevronDown size={12} color={c.textMuted} />
        )}
      </Pressable>

      {/* Expanded panel */}
      {open ? (
        <View
          style={[
            styles.panel,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            style={{
              fontFamily: "Syne_700Bold",
              fontSize: 14,
              fontWeight: "700",
              color: c.text,
            }}
          >
            Choose a plan
          </AppText>
          <AppText
            style={{
              fontSize: 11,
              color: c.textDim,
              marginTop: 3,
              marginBottom: 12,
            }}
          >
            One-time cover for this booking. Paid securely via Flutterwave.
          </AppText>

          {/* Plan cards */}
          {loading ? (
            <View style={{ gap: 8 }}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.planSkeleton,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                />
              ))}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {plans.map((plan) => {
                const active = selected === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => setSelected(plan.id)}
                    style={({ pressed }) => [
                      styles.planCard,
                      {
                        backgroundColor: active ? c.orangeDim : c.bgCard,
                        borderColor: active ? c.orange : c.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    {plan.popular ? (
                      <View
                        style={[
                          styles.popularBadge,
                          { backgroundColor: c.orange },
                        ]}
                      >
                        <AppText
                          style={{
                            fontSize: 9,
                            fontWeight: "800",
                            color: c.bg,
                            letterSpacing: 0.3,
                          }}
                        >
                          MOST POPULAR
                        </AppText>
                      </View>
                    ) : null}

                    <AppText
                      style={{ fontSize: 13, fontWeight: "700", color: c.text }}
                    >
                      {plan.name}
                    </AppText>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "baseline",
                        gap: 3,
                        marginTop: 4,
                      }}
                    >
                      <AppText style={{ fontSize: 10, color: c.textDim }}>
                        USD
                      </AppText>
                      <AppText
                        style={{
                          fontFamily: "Syne_800ExtraBold",
                          fontSize: 24,
                          fontWeight: "800",
                          color: c.orange,
                        }}
                      >
                        ${plan.price}
                      </AppText>
                    </View>

                    <AppText
                      style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}
                    >
                      Covers up to $
                      {(plan.coverageAmount || 0).toLocaleString()}
                    </AppText>

                    <View style={{ gap: 4, marginTop: 10 }}>
                      {(plan.features || []).map((f, i) => (
                        <View
                          key={i}
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-start",
                            gap: 5,
                          }}
                        >
                          <FaCheck
                            size={9}
                            color={c.green}
                            style={{ marginTop: 3 }}
                          />
                          <AppText
                            style={{
                              fontSize: 11,
                              color: c.textDim,
                              flex: 1,
                              lineHeight: 16,
                            }}
                          >
                            {f}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Error */}
          {error ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: c.redDim, borderColor: c.red },
              ]}
            >
              <FaExclamationTriangle size={10} color={c.red} />
              <AppText
                style={{ fontSize: 11, color: c.red, marginLeft: 6, flex: 1 }}
              >
                {error}
              </AppText>
            </View>
          ) : null}

          {/* Purchase row */}
          <View style={styles.purchaseRow}>
            {selectedPlan ? (
              <AppText style={{ fontSize: 11, color: c.textDim, flex: 1 }}>
                {selectedPlan.name} — USD ${selectedPlan.price}
              </AppText>
            ) : null}
            <Pressable
              onPress={handleCheckout}
              disabled={!selected || purchasing}
              style={({ pressed }) => [
                styles.purchaseBtn,
                {
                  backgroundColor:
                    !selected || purchasing ? c.bgInput : c.orange,
                  opacity: !selected || purchasing ? 0.5 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {purchasing ? (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <ActivityIndicator color={c.bg} size="small" />
                  <AppText
                    style={{ fontSize: 12, fontWeight: "700", color: c.bg }}
                  >
                    Redirecting…
                  </AppText>
                </View>
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <FaShieldAlt size={12} color={c.bg} />
                  <AppText
                    style={{ fontSize: 12, fontWeight: "700", color: c.bg }}
                  >
                    Pay & Activate Insurance
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>

          {/* Disclaimer */}
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              lineHeight: 15,
              marginTop: 8,
            }}
          >
            Secure payment via Flutterwave. Coverage activates immediately after
            payment. You will be redirected back automatically.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  insuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginTop: 8,
    gap: 10,
  },
  planCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: -8,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  planSkeleton: {
    height: 130,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  purchaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
  },
  purchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    minHeight: 42,
  },
});
