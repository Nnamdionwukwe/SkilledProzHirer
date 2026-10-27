// src/components/booking/CryptoRateConverter.js
//
// Verbatim port of components/payment/CryptoRateConverter.jsx.
//
// · Fetches live fiat↔crypto rates from CoinGecko's public API
// · Refreshes every 30s (configurable via refreshInterval prop)
// · Renders 4 token cards (USDC / USDT / BTC / ETH) with:
//     - live rate in fiat
//     - converted amount in crypto for the current fiatAmount
//     - selection indicator
// · Emits onAmountChange({ token, amount, rate, fiatAmount, fiatCurrency })
//   whenever the crypto amount changes (debounced naturally by state)
//
// Port notes:
//   · navigator.clipboard.writeText → expo-clipboard (guarded require)
//   · <button> → <Pressable>
//   · CSS grid 2-col → flexDirection row + flexWrap (2 columns via width: 48%)
//   · Sizes match CSS at phone root 14

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import {
  FaBitcoin,
  FaDollarSign,
  FaMoneyBillWave,
  FaSync,
  FaExclamationTriangle,
  FaCopy,
} from "../../icons/fa";

// Optional expo-clipboard — guarded
let Clipboard = null;
try {
  Clipboard = require("expo-clipboard");
} catch {}

const CRYPTO_TOKENS = [
  { id: "USDC", label: "USDC", icon: "dollar", coingeckoId: "usd-coin" },
  { id: "USDT", label: "USDT", icon: "bill", coingeckoId: "tether" },
  { id: "BTC", label: "Bitcoin", icon: "bitcoin", coingeckoId: "bitcoin" },
  { id: "ETH", label: "Ethereum", icon: "eth", coingeckoId: "ethereum" },
];

const COINGECKO_IDS = CRYPTO_TOKENS.map((t) => t.coingeckoId).join(",");

function TokenIcon({ iconName, size = 20, color }) {
  if (iconName === "dollar") return <FaDollarSign size={size} color={color} />;
  if (iconName === "bill") return <FaMoneyBillWave size={size} color={color} />;
  if (iconName === "bitcoin") return <FaBitcoin size={size} color={color} />;
  // eth — no direct Ionicon, use diamond outline
  return <FaMoneyBillWave size={size} color={color} />;
}

export default function CryptoRateConverter({
  fiatAmount,
  fiatCurrency = "NGN",
  onAmountChange,
  selectedToken: initialToken = "USDC",
  refreshInterval = 30000,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedToken, setSelectedToken] = useState(initialToken);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copied, setCopied] = useState(false);

  const lastEmittedRef = useRef(null);

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
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [fiatCurrency]);

  useEffect(() => {
    fetchRates();
    const id = setInterval(fetchRates, refreshInterval);
    return () => clearInterval(id);
  }, [fetchRates, refreshInterval]);

  const selectedRate = rates?.[selectedToken];
  const cryptoAmount =
    selectedRate && fiatAmount > 0 ? fiatAmount / selectedRate : 0;

  // Emit on change
  useEffect(() => {
    if (!onAmountChange || cryptoAmount <= 0) return;
    const payload = {
      token: selectedToken,
      amount: cryptoAmount,
      rate: selectedRate,
      fiatAmount,
      fiatCurrency,
    };
    // Avoid emitting identical payloads multiple times (causes parent re-renders)
    const key = `${payload.token}|${payload.amount.toFixed(8)}|${payload.rate}`;
    if (lastEmittedRef.current === key) return;
    lastEmittedRef.current = key;
    onAmountChange(payload);
  }, [
    cryptoAmount,
    selectedToken,
    selectedRate,
    fiatAmount,
    fiatCurrency,
    onAmountChange,
  ]);

  const handleCopy = async () => {
    if (!cryptoAmount || !selectedToken) return;
    const text = `${cryptoAmount.toFixed(6)} ${selectedToken}`;
    if (Clipboard) {
      try {
        await Clipboard.setStringAsync(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {}
    }
    // Fallback if clipboard not available
    setCopied(false);
  };

  // ── Initial loading ─────────────────────────────────────────────────
  if (loading && !rates) {
    return (
      <View
        style={[
          styles.converter,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
          <ActivityIndicator color={c.orange} />
          <AppText style={{ fontSize: 12, color: c.textDim }}>
            Loading live exchange rates…
          </AppText>
        </View>
      </View>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <View
        style={[
          styles.converter,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={{ alignItems: "center", paddingVertical: 20, gap: 10 }}>
          <FaExclamationTriangle size={20} color={c.red} />
          <AppText
            style={{ fontSize: 12, color: c.textDim, textAlign: "center" }}
          >
            Could not load rates: {error}
          </AppText>
          <Pressable
            onPress={fetchRates}
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: c.orange, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <AppText style={{ fontSize: 12, fontWeight: "700", color: c.bg }}>
              Retry
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // MAIN
  // ═════════════════════════════════════════════════════════════════════
  return (
    <View
      style={[
        styles.converter,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
          Live Crypto Rates
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText style={{ fontSize: 10, color: c.textMuted }}>
            {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : "—"}
          </AppText>
          <Pressable
            onPress={fetchRates}
            disabled={loading}
            hitSlop={6}
            style={{ opacity: loading ? 0.4 : 1 }}
          >
            <FaSync size={12} color={c.textDim} />
          </Pressable>
        </View>
      </View>

      {/* Fiat amount */}
      <View
        style={[
          styles.fiatBox,
          { backgroundColor: c.bgCard, borderColor: c.orangeGlow },
        ]}
      >
        <AppText style={{ fontSize: 13, color: c.textDim }}>You pay:</AppText>
        <AppText
          style={{
            fontFamily: "Syne_800ExtraBold",
            fontSize: 16,
            fontWeight: "800",
            color: c.orange,
          }}
        >
          {fiatCurrency} {(Number(fiatAmount) || 0).toFixed(2)}
        </AppText>
      </View>

      {/* Token grid */}
      <View style={styles.tokenGrid}>
        {CRYPTO_TOKENS.map((token) => {
          const rate = rates?.[token.id];
          const isSelected = selectedToken === token.id;
          const isZero = rate === null || rate === 0;
          const tokenAmount = rate ? fiatAmount / rate : 0;

          return (
            <Pressable
              key={token.id}
              onPress={() => {
                if (!isZero && rate) setSelectedToken(token.id);
              }}
              disabled={isZero || !rate}
              style={({ pressed }) => [
                styles.tokenCard,
                {
                  backgroundColor: isSelected ? c.orangeDim : c.bgCard,
                  borderColor: isSelected ? c.orange : c.border,
                  opacity: isZero ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <TokenIcon
                iconName={token.icon}
                size={22}
                color={isSelected ? c.orange : c.textDim}
              />
              <View style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isSelected ? c.orange : c.text,
                  }}
                >
                  {token.label}
                </AppText>
                <AppText
                  style={{ fontSize: 9, color: c.textMuted, marginTop: 2 }}
                  numberOfLines={1}
                >
                  {rate
                    ? `1 ${token.label} = ${fiatCurrency} ${Number(rate).toFixed(4)}`
                    : "No rate"}
                </AppText>
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "600",
                    color: isSelected ? c.orange : c.textDim,
                    marginTop: 3,
                  }}
                  numberOfLines={1}
                >
                  {isSelected && rate
                    ? `${tokenAmount.toFixed(6)} ${token.label}`
                    : rate
                      ? `${tokenAmount.toFixed(6)} ${token.label}`
                      : "—"}
                </AppText>
              </View>
              {isSelected ? (
                <View style={[styles.checkmark, { backgroundColor: c.green }]}>
                  <AppText
                    style={{
                      fontSize: 8,
                      fontWeight: "800",
                      color: "#fff",
                    }}
                  >
                    ✓
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Result + copy */}
      {selectedRate && cryptoAmount > 0 ? (
        <View
          style={[
            styles.resultBox,
            {
              backgroundColor: c.greenDim,
              borderColor: "rgba(34,197,94,0.2)",
            },
          ]}
        >
          <View style={styles.resultRow}>
            <AppText
              style={{ fontSize: 12, color: c.text, flex: 1, lineHeight: 18 }}
            >
              You need to send{" "}
              <AppText style={{ fontWeight: "700", color: c.green }}>
                {cryptoAmount.toFixed(6)} {selectedToken}
              </AppText>
            </AppText>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.copyBtn,
                {
                  backgroundColor: copied ? c.greenDim : c.bgCard,
                  borderColor: copied ? c.green : c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaCopy size={10} color={copied ? c.green : c.textDim} />
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: copied ? c.green : c.textDim,
                  marginLeft: 4,
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
              marginTop: 4,
              lineHeight: 14,
            }}
          >
            Rates are live and may change. The exact amount may vary slightly
            when you complete the transfer.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  converter: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  fiatBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tokenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tokenCard: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    position: "relative",
    minHeight: 68,
  },
  checkmark: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resultBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
});
