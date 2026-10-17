// src/components/booking/InsuranceAddon.js
import React, { useState } from "react";
import { View, Pressable, Linking, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { FaShieldAlt, FaSpinner } from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";

export default function InsuranceAddon({ bookingId, booking, onPurchased }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBuy = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.post("/insurance/checkout", {
        bookingId,
        plan: "standard",
      });
      const url = res.data?.data?.authorizationUrl || res.data?.data?.url;
      if (url) {
        await Linking.openURL(url);
        onPurchased?.();
      } else {
        setError("Could not start checkout.");
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Insurance checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          gap: 8,
          marginBottom: 6,
        }}
      >
        <FaShieldAlt size={16} color={c.orange} />
        <AppText weight="bold" style={{ flex: 1 }}>
          {t("booking.insurance.title")}
        </AppText>
      </View>
      <AppText variant="small" tone="dim" style={{ marginBottom: 8 }}>
        {t("booking.insurance.subtitle")}
      </AppText>
      {error ? (
        <AppText variant="small" style={{ color: "#ef4444", marginBottom: 6 }}>
          {error}
        </AppText>
      ) : null}
      <Pressable
        onPress={handleBuy}
        disabled={loading}
        style={[
          styles.buyBtn,
          { backgroundColor: c.orange, opacity: loading ? 0.5 : 1 },
        ]}
      >
        {loading ? <FaSpinner size={11} color={c.bg} /> : null}
        <AppText
          weight="bold"
          style={{ color: c.bg, marginLeft: loading ? 6 : 0 }}
        >
          {loading
            ? t("booking.insurance.payActivate")
            : t("booking.insurance.payActivate")}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 8,
  },
});
