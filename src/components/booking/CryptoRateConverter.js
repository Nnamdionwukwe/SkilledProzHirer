// src/components/booking/CryptoRateConverter.js

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import {
  FaBitcoin,
  FaEthereum,
  FaDollarSign,
  FaMoneyBill,
  FaSync,
  FaExclamationTriangle,
  FaCopy,
} from "../../icons/fa";

const CRYPTO_TOKENS = [
  { id: "USDC", label: "USDC", icon: FaDollarSign, coingeckoId: "usd-coin" },
  { id: "USDT", label: "USDT", icon: FaMoneyBill, coingeckoId: "tether" },
  { id: "BTC", label: "Bitcoin", icon: FaBitcoin, coingeckoId: "bitcoin" },
  { id: "ETH", label: "Ethereum", icon: FaEthereum, coingeckoId: "ethereum" },
];

const COINGECKO_IDS = CRYPTO_TOKENS.map((t) => t.coingeckoId).join(",");

function formatNumber(amount, decimals = 2) {
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function CryptoRateConverter({
  fiatAmount,
  fiatCurrency = "NGN",
  onAmountChange,
  selectedToken: initialToken = "USDC",
  refreshInterval = 30000,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedToken, setSelectedToken] = useState(initialToken);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copied, setCopied] = useState(false);

  const safeFiat = Number(fiatAmount) || 0;

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=${fiatCurrency.toLowerCase()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newRates = {};
      CRYPTO_TOKENS.forEach((token) => {
        const price = data[token.coingeckoId]?.[fiatCurrency.toLowerCase()];
        newRates[token.id] = price || null;
      });
      setRates(newRates);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fiatCurrency]);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchRates, refreshInterval]);

  const selectedRate = rates?.[selectedToken];
  const cryptoAmount =
    selectedRate && safeFiat > 0 ? safeFiat / selectedRate : 0;

  useEffect(() => {
    if (onAmountChange && cryptoAmount > 0) {
      onAmountChange({
        token: selectedToken,
        amount: cryptoAmount,
        rate: selectedRate,
        fiatAmount: safeFiat,
        fiatCurrency,
      });
    }
  }, [
    cryptoAmount,
    selectedToken,
    selectedRate,
    safeFiat,
    fiatCurrency,
    onAmountChange,
  ]);

  const handleCopy = async () => {
    if (!cryptoAmount || !selectedToken) return;
    const text = `${cryptoAmount.toFixed(6)} ${selectedToken}`;
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading && !rates) {
    return (
      <View
        style={[
          styles.converter,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={styles.loading}>
          <ActivityIndicator color={c.orange} />
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              fontFamily: "DMSans_400Regular",
            }}
          >
            Loading live exchange rates…
          </AppText>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.converter,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={styles.error}>
          <FaExclamationTriangle size={20} color={c.red} />
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              fontFamily: "DMSans_400Regular",
            }}
          >
            Could not load rates: {error}
          </AppText>
          <Pressable
            onPress={fetchRates}
            style={[styles.retryBtn, { backgroundColor: c.orange }]}
          >
            <AppText
              style={{
                color: "#000",
                fontSize: 12,
                fontWeight: "700",
                fontFamily: "DMSans_700Bold",
              }}
            >
              Retry
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.converter,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <View style={styles.header}>
        <AppText
          style={{
            fontWeight: "700",
            fontSize: 13,
            color: c.text,
            fontFamily: "Syne_700Bold",
          }}
        >
          Live Crypto Rates
        </AppText>
        <View style={styles.headerRight}>
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              fontFamily: "DMSans_400Regular",
            }}
          >
            {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : "—"}
          </AppText>
          <Pressable
            onPress={fetchRates}
            disabled={loading}
            style={styles.refreshBtn}
            hitSlop={8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={c.orange} />
            ) : (
              <FaSync size={12} color={c.textDim} />
            )}
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.amountDisplay,
          { backgroundColor: c.bgCard, borderColor: c.orangeGlow },
        ]}
      >
        <AppText
          style={{
            fontSize: 12,
            color: c.textDim,
            fontFamily: "DMSans_400Regular",
          }}
        >
          You pay:
        </AppText>
        <AppText
          style={{
            fontWeight: "800",
            fontSize: 16,
            color: c.orange,
            fontFamily: "Syne_800ExtraBold",
          }}
        >
          {fiatCurrency} {formatNumber(safeFiat, 2)}
        </AppText>
      </View>

      <View style={styles.tokenGrid}>
        {CRYPTO_TOKENS.map((token) => {
          const Icon = token.icon;
          const rate = rates?.[token.id];
          const isSelected = selectedToken === token.id;
          const isZero = rate === null || rate === 0;
          const tokenAmount = rate ? safeFiat / rate : 0;

          return (
            <Pressable
              key={token.id}
              onPress={() => {
                if (!isZero && rate) setSelectedToken(token.id);
              }}
              disabled={isZero || !rate}
              style={[
                styles.tokenCard,
                {
                  borderColor: isSelected ? c.orange : c.border,
                  backgroundColor: isSelected ? c.orangeDim : c.bgCard,
                  opacity: isZero ? 0.5 : 1,
                },
              ]}
            >
              <View style={styles.tokenIcon}>
                <Icon size={20} color={isSelected ? c.orange : c.textDim} />
              </View>
              <View style={styles.tokenInfo}>
                <AppText
                  style={{
                    fontWeight: "700",
                    fontSize: 12,
                    color: isSelected ? c.orange : c.text,
                    fontFamily: "DMSans_700Bold",
                  }}
                >
                  {token.label}
                </AppText>
                <AppText
                  style={{
                    fontSize: 9,
                    color: c.textMuted,
                    fontFamily: "DMSans_400Regular",
                    marginTop: 1,
                  }}
                >
                  {rate
                    ? `1 ${token.label} = ${fiatCurrency} ${formatNumber(rate, 2)}`
                    : "No rate"}
                </AppText>
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isSelected ? c.orange : c.textDim,
                    fontFamily: "DMSans_700Bold",
                    marginTop: 2,
                  }}
                >
                  {rate ? `${tokenAmount.toFixed(6)} ${token.label}` : "—"}
                </AppText>
              </View>
              {isSelected && (
                <View style={styles.checkmark}>
                  <AppText
                    style={{ color: c.green, fontWeight: "700", fontSize: 11 }}
                  >
                    ✓
                  </AppText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {selectedRate && cryptoAmount > 0 && (
        <View
          style={[
            styles.resultBox,
            { backgroundColor: c.greenDim, borderColor: "rgba(34,197,94,0.2)" },
          ]}
        >
          <View style={styles.resultRow}>
            <AppText
              style={{
                fontSize: 12,
                color: c.text,
                flex: 1,
                fontFamily: "DMSans_400Regular",
              }}
            >
              You need to send{" "}
              <AppText
                style={{
                  fontWeight: "800",
                  color: c.green,
                  fontFamily: "Syne_800ExtraBold",
                }}
              >
                {cryptoAmount.toFixed(6)} {selectedToken}
              </AppText>
            </AppText>
            <Pressable
              onPress={handleCopy}
              style={[
                styles.copyBtn,
                copied
                  ? { backgroundColor: c.greenDim, borderColor: c.green }
                  : { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaCopy size={10} color={copied ? c.green : c.textDim} />
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  marginLeft: 4,
                  color: copied ? c.green : c.textDim,
                  fontFamily: "DMSans_700Bold",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </AppText>
            </Pressable>
          </View>
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              marginTop: 6,
              fontStyle: "italic",
              fontFamily: "DMSans_400Regular",
            }}
          >
            Rates are live and may change. The exact amount may vary slightly
            when you complete the transfer.
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  converter: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
  },
  loading: { alignItems: "center", paddingVertical: 24, gap: 12 },
  error: { alignItems: "center", paddingVertical: 24, gap: 12 },
  retryBtn: { borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  refreshBtn: { padding: 4 },
  amountDisplay: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
  },
  tokenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tokenCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    position: "relative",
  },
  tokenIcon: { width: 20, alignItems: "center", justifyContent: "center" },
  tokenInfo: { flex: 1, gap: 2 },
  checkmark: { position: "absolute", top: 6, right: 8 },
  resultBox: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
