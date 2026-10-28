// src/contexts/SubscriptionContext.js
//
// Auth is proven by `user` existing — the axios client already injects
// the Bearer token into every request. We don't need to extract the
// token from the store, and we shouldn't gate on it.

import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import client from "../api/client";
import { useAuthStore } from "../store/authStore";

const SubscriptionContext = createContext(null);

function extractTierFromUser(user) {
  if (!user) return null;
  return (
    user.subscriptionTier ||
    user.tier ||
    user.subscription?.tier ||
    user.plan?.tier ||
    null
  );
}

export function SubscriptionProvider({ children }) {
  const { user } = useAuthStore();

  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const tierFromUser = extractTierFromUser(user);
  const tier = subscription?.tier || tierFromUser || "FREE";
  const isFreeTier = tier === "FREE";
  const isProTier = tier === "PRO" || tier === "ENTERPRISE";
  const isEnterprise = tier === "ENTERPRISE";

  // ── Fetch subscription when user becomes available ─────────────
  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    client
      .get("/subscriptions/my")
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data ?? {};
        const sub =
          data.subscription ?? (data.tier ? { tier: data.tier } : null);
        setSubscription(sub);
        setPlan(data.plan ?? null);
      })
      .catch((err) => {
        if (__DEV__) {
          console.log(
            "[SubscriptionContext] /subscriptions/my failed:",
            err?.response?.status,
            err?.response?.data?.message || err?.message,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ── Re-fetch when app returns to foreground (picks up tier changes) ─
  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        client
          .get("/subscriptions/my")
          .then((res) => {
            const data = res?.data?.data ?? {};
            const s =
              data.subscription ?? (data.tier ? { tier: data.tier } : null);
            setSubscription(s);
            setPlan(data.plan ?? null);
          })
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  const features = {
    advancedSearch: isProTier,
    gpsRadius: isProTier,
    verifiedFirst: isProTier,
    unlimitedSavedWorkers: isProTier,
    unlimitedJobPosts: isProTier,
    directBooking: isProTier,
    unlimitedApplications: isProTier,
    priorityMatching: isProTier,
    proBadge: isProTier,
    boostedSearch: isProTier,
    videoIntro: isProTier,
    unlimitedPortfolio: isProTier,
    analytics: isProTier,
    jobAnalytics: isProTier,
    earningsAnalytics: isProTier,
    prioritySupport: isProTier,
    accountManager: isEnterprise,
    teamAccounts: isEnterprise,
    apiAccess: isEnterprise,
    bulkHiring: isEnterprise,
    whitelabelInvoices: isEnterprise,
    complianceReporting: isEnterprise,
    customSLA: isEnterprise,
    jobPostsPerMonth: plan?.limits?.jobPostsPerMonth ?? 3,
    bidsPerMonth: plan?.limits?.bidsPerMonth ?? 5,
    portfolioImages: plan?.limits?.portfolioImages ?? 1,
    teamAccountCount: plan?.limits?.teamAccounts ?? 0,
  };

  const refresh = () => {
    if (!user) return;
    client
      .get("/subscriptions/my")
      .then((res) => {
        const data = res?.data?.data ?? {};
        const sub =
          data.subscription ?? (data.tier ? { tier: data.tier } : null);
        setSubscription(sub);
        setPlan(data.plan ?? null);
      })
      .catch(() => {});
  };

  if (__DEV__) {
    console.log("[SubscriptionContext]", {
      hasUser: !!user,
      userId: user?.id,
      tierFromUser,
      tierFromAPI: subscription?.tier ?? null,
      effectiveTier: tier,
      isProTier,
      isEnterprise,
    });
  }

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan,
        tier,
        loading,
        isFreeTier,
        isProTier,
        isEnterprise,
        features,
        refresh,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    return {
      subscription: null,
      plan: null,
      tier: "FREE",
      loading: false,
      isFreeTier: true,
      isProTier: false,
      isEnterprise: false,
      features: {},
      refresh: () => {},
    };
  }
  return ctx;
}
