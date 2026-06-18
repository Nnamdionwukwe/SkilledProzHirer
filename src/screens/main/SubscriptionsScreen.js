// src/screens/main/SubscriptionsScreen.js
// Endpoints: GET /subscriptions/plans?role=HIRER
//            GET /subscriptions/my
//            POST /subscriptions/checkout  → opens Stripe URL in browser
//            POST /subscriptions/cancel
// Mirrors website SubscriptionPlans page exactly.

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import AppText from "../../components/AppText";
import client from "../../api/client";

// ── API ───────────────────────────────────────────────────────────────────────
import {
  getPlans,
  getMySubscription,
  createCheckout,
  cancelSubscription,
} from "../../api/subscriptions";
// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={{ gap: 16 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.planCard,
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              minHeight: 300,
              opacity: 0.4,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, isCurrent, isPopular, onSubscribe, subscribing, c }) {
  const isFree = plan.price === 0;

  // Border color
  const borderColor = isCurrent ? "#22c55e" : isPopular ? c.orange : c.border;

  const btnBg = isCurrent
    ? "transparent"
    : isPopular || !isFree
      ? c.orange
      : c.bgInput;

  const btnLabel = isCurrent
    ? "Current Plan"
    : isFree
      ? "Free Plan"
      : `Upgrade to ${plan.name}`;

  const btnTextColor = isCurrent ? "#22c55e" : isFree ? c.textMuted : "#fff";

  return (
    <View
      style={[
        styles.planCard,
        { backgroundColor: c.bgCard, borderColor },
        isCurrent && { borderWidth: 2 },
        isPopular && !isCurrent && { borderWidth: 2 },
      ]}
    >
      {/* Top badge */}
      {(isPopular || isCurrent) && (
        <View style={styles.badgeWrap}>
          <View
            style={[
              styles.badge,
              { backgroundColor: isCurrent ? "#22c55e" : c.orange },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: "#fff", fontSize: 12 }}
            >
              {isCurrent ? "Current Plan" : "Most Popular"}
            </AppText>
          </View>
        </View>
      )}

      <View style={styles.planBody}>
        {/* Plan name */}
        <AppText
          weight="displayBlack"
          style={[styles.planName, { color: c.text }]}
        >
          {plan.name}
        </AppText>

        {/* Price */}
        <View style={styles.priceRow}>
          {isFree ? (
            <AppText
              weight="displayBlack"
              style={[styles.priceAmount, { color: c.orange }]}
            >
              Free
            </AppText>
          ) : (
            <>
              <AppText
                style={{
                  color: c.textMuted,
                  fontSize: 15,
                  marginRight: 4,
                  alignSelf: "flex-end",
                  marginBottom: 4,
                }}
              >
                {plan.currency}
              </AppText>
              <AppText
                weight="displayBlack"
                style={[styles.priceAmount, { color: c.orange }]}
              >
                {plan.price.toLocaleString()}
              </AppText>
              <AppText
                style={{
                  color: c.textMuted,
                  fontSize: 15,
                  alignSelf: "flex-end",
                  marginBottom: 4,
                  marginLeft: 2,
                }}
              >
                /mo
              </AppText>
            </>
          )}
        </View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {plan.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <AppText
                style={{
                  color: "#22c55e",
                  fontSize: 15,
                  marginRight: 10,
                  marginTop: 1,
                }}
              >
                ✓
              </AppText>
              <AppText
                variant="body"
                style={{ color: c.textMuted, flex: 1, lineHeight: 22 }}
              >
                {f}
              </AppText>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => !isCurrent && !isFree && onSubscribe(plan.id)}
          disabled={isCurrent || isFree || subscribing === plan.id}
          style={[
            styles.planBtn,
            {
              backgroundColor: btnBg,
              borderColor: isCurrent ? "#22c55e" : isFree ? c.border : c.orange,
              borderWidth: isCurrent || isFree ? 1 : 0,
              opacity: subscribing && subscribing !== plan.id ? 0.5 : 1,
            },
          ]}
        >
          {subscribing === plan.id ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: btnTextColor }}
            >
              {btnLabel}
            </AppText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SubscriptionsScreen({ navigation }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        getPlans(user?.role ?? "HIRER"), // passes the viewer's role
        getMySubscription(),
      ]);
      setPlans(p);
      setCurrent(s);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    try {
      const data = await createCheckout(planId);
      if (data?.url) {
        // Open Stripe checkout in browser
        await Linking.openURL(data.url);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to start checkout");
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure? You'll keep access until the end of the billing period.",
      [
        { text: "Keep Plan", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSubscription();
              toast.success(
                "Subscription cancelled. Access remains until period end.",
              );
              load();
            } catch {
              toast.error("Failed to cancel subscription");
            }
          },
        },
      ],
    );
  };

  const currentTier = current?.subscription?.tier ?? "FREE";
  const hasActivePaid = currentTier !== "FREE";

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.orange}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <View style={styles.hero}>
        <AppText
          weight="displayBlack"
          style={[styles.heroTitle, { color: c.text }]}
        >
          Choose Your Plan
        </AppText>
        <AppText style={[styles.heroSub, { color: c.textMuted }]}>
          Hire smarter, faster, and at scale
        </AppText>
      </View>

      {/* ── Active plan banner ── */}
      {!loading && hasActivePaid && (
        <View
          style={[
            styles.activeBanner,
            { backgroundColor: "rgba(34,197,94,0.08)", borderColor: "#22c55e" },
          ]}
        >
          <AppText style={{ fontSize: 22, lineHeight: 28 }}>✅</AppText>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="body" weight="semibold" style={{ color: c.text }}>
              Active: {current?.plan?.name}
            </AppText>
            {current?.expiresAt && (
              <AppText
                variant="small"
                style={{ color: c.textMuted, marginTop: 2 }}
              >
                Renews {fmtDate(current.expiresAt)}
              </AppText>
            )}
          </View>
          <Pressable onPress={handleCancel}>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.orange }}
            >
              Cancel
            </AppText>
          </Pressable>
        </View>
      )}

      {/* ── Plans ── */}
      {loading ? (
        <Skeleton c={c} />
      ) : (
        <View style={{ gap: 20 }}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={currentTier === plan.tier}
              isPopular={!!plan.popular}
              onSubscribe={handleSubscribe}
              subscribing={subscribing}
              c={c}
            />
          ))}
        </View>
      )}

      {/* ── Disclaimer ── */}
      {!loading && (
        <AppText
          variant="small"
          style={{ color: c.textMuted, textAlign: "center", marginTop: 24 }}
        >
          Payments processed securely. Cancel anytime. All prices in USD.
        </AppText>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Hero
  hero: { marginBottom: 24 },
  heroTitle: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 8,
  },
  heroSub: { fontSize: 15, lineHeight: 22 },

  // Active banner
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },

  // Plan card
  // Change planCard style:
  planCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 14, // ← makes room for the absolute badge above
  },
  badgeWrap: {
    position: "absolute",
    top: -14,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planBody: { padding: 22, paddingTop: 28 },

  // Plan name
  planName: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 14,
    lineHeight: 28,
  },

  // Price
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 20 },
  priceAmount: {
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 60, // ← add this
  },

  // Features
  featureList: { gap: 10, marginBottom: 24 },
  featureRow: { flexDirection: "row", alignItems: "flex-start" },

  // Button
  planBtn: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
  },
});
