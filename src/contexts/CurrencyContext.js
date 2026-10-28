// src/contexts/CurrencyContext.js
//
// Mobile currency context — EXTENDED with web's dual-currency model
// (dashboard display vs payment currency) so SettingsScreen.js can port.
//
// Preserves mobile fields: `currency`, `currencyCode`, `setCurrencyCode`,
// `format`, `currencies`. Adds web fields: `dashboardCurrency`,
// `paymentCurrency`, `changeDashboardCurrency`, `changePaymentCurrency`,
// `fmt`, `CURRENCY_META`, `ALL_CURRENCIES`.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CURRENCIES, getCurrency } from "../constants/currencies";
import client from "../api/client";
import { useAuthStore } from "../store/authStore";

const STORAGE_KEY = "@skilledproz:currency";
const DASH_KEY = "@skilledproz:dashboard_currency";

// Web's CURRENCY_META — merge the mobile `CURRENCIES` constants with
// symbols that web has but mobile might not (USDC, USDT, etc.)
export const CURRENCY_META = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  GHS: { symbol: "₵", name: "Ghanaian Cedi" },
  KES: { symbol: "KSh", name: "Kenyan Shilling" },
  ZAR: { symbol: "R", name: "South African Rand" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  CAD: { symbol: "CA$", name: "Canadian Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  MXN: { symbol: "MX$", name: "Mexican Peso" },
  EGP: { symbol: "E£", name: "Egyptian Pound" },
  TZS: { symbol: "TSh", name: "Tanzanian Shilling" },
  UGX: { symbol: "USh", name: "Ugandan Shilling" },
  RWF: { symbol: "RF", name: "Rwandan Franc" },
  XOF: { symbol: "CFA", name: "West African CFA" },
  MAD: { symbol: "DH", name: "Moroccan Dirham" },
  PHP: { symbol: "₱", name: "Philippine Peso" },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah" },
  VND: { symbol: "₫", name: "Vietnamese Dong" },
  THB: { symbol: "฿", name: "Thai Baht" },
  BDT: { symbol: "৳", name: "Bangladeshi Taka" },
  PKR: { symbol: "₨", name: "Pakistani Rupee" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
  SAR: { symbol: "﷼", name: "Saudi Riyal" },
  QAR: { symbol: "QR", name: "Qatari Riyal" },
  MYR: { symbol: "RM", name: "Malaysian Ringgit" },
  SGD: { symbol: "S$", name: "Singapore Dollar" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar" },
  USDC: { symbol: "USDC", name: "USD Coin" },
  USDT: { symbol: "USDT", name: "Tether" },
};

export const ALL_CURRENCIES = Object.keys(CURRENCY_META);

const CurrencyContext = createContext({
  currency: CURRENCIES[0],
  setCurrencyCode: () => {},
  format: () => "",
  dashboardCurrency: "USD",
  paymentCurrency: "USD",
  changeDashboardCurrency: () => {},
  changePaymentCurrency: () => {},
  fmt: () => "",
  CURRENCY_META,
  ALL_CURRENCIES,
});

export function CurrencyProvider({ children, initialCode = "USD" }) {
  const [code, setCode] = useState(initialCode);
  const [dashboardCurrency, setDashboardCurrency] = useState(initialCode);
  const [paymentCurrency, setPaymentCurrency] = useState(initialCode);
  const { user, updateUser } = useAuthStore();

  // Hydrate all three from storage
  useEffect(() => {
    (async () => {
      try {
        const [savedCode, savedDash] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(DASH_KEY),
        ]);
        if (savedCode) {
          setCode(savedCode);
          setPaymentCurrency(savedCode);
        }
        if (savedDash) setDashboardCurrency(savedDash);
      } catch {}
    })();
  }, []);

  // Sync from user
  useEffect(() => {
    if (user?.dashboardCurrency) setDashboardCurrency(user.dashboardCurrency);
    if (user?.paymentCurrency) setPaymentCurrency(user.paymentCurrency);
    if (user?.currency) setCode(user.currency);
  }, [user?.currency, user?.dashboardCurrency, user?.paymentCurrency]);

  const setCurrencyCode = async (next) => {
    setCode(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const changeDashboardCurrency = useCallback(
    async (next) => {
      setDashboardCurrency(next);
      try {
        await AsyncStorage.setItem(DASH_KEY, next);
      } catch {}
      if (user) {
        try {
          await client.patch("/settings/profile", {
            dashboardCurrency: next,
          });
          updateUser?.({ dashboardCurrency: next });
        } catch {}
      }
    },
    [user, updateUser],
  );

  const changePaymentCurrency = useCallback(
    async (next) => {
      setPaymentCurrency(next);
      if (user) {
        try {
          await client.patch("/settings/profile", {
            paymentCurrency: next,
          });
          updateUser?.({ paymentCurrency: next });
        } catch {}
      }
    },
    [user, updateUser],
  );

  const currency = getCurrency(code);

  const format = useMemo(
    () =>
      (amount, opts = {}) => {
        const targetCode = opts.currencyCode || code;
        const target = getCurrency(targetCode);
        const num = Number(amount ?? 0);
        try {
          return new Intl.NumberFormat(opts.locale || undefined, {
            style: "currency",
            currency: targetCode,
            minimumFractionDigits: opts.minimumFractionDigits ?? 0,
            maximumFractionDigits: opts.maximumFractionDigits ?? 2,
          }).format(num);
        } catch {
          const formatted = num.toLocaleString(undefined, {
            minimumFractionDigits: opts.minimumFractionDigits ?? 0,
            maximumFractionDigits: opts.maximumFractionDigits ?? 2,
          });
          return `${target.symbol}${formatted}`;
        }
      },
    [code],
  );

  // Web parity: fmt(amount, currencyCode)
  const fmt = useCallback(
    (amount, currencyCode) => {
      const targetCode = currencyCode || dashboardCurrency;
      const isCrypto = ["USDC", "USDT"].includes(targetCode);
      const meta = CURRENCY_META[targetCode] || { symbol: targetCode };
      try {
        if (isCrypto) {
          return `${meta.symbol} ${Number(amount || 0).toFixed(2)}`;
        }
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: targetCode,
          maximumFractionDigits: [
            "JPY",
            "KES",
            "TZS",
            "UGX",
            "RWF",
            "XOF",
            "NGN",
            "GHS",
          ].includes(targetCode)
            ? 0
            : 2,
        }).format(amount || 0);
      } catch {
        return `${meta.symbol} ${Number(amount || 0).toFixed(2)}`;
      }
    },
    [dashboardCurrency],
  );

  const value = useMemo(
    () => ({
      // Mobile-preserved
      currency,
      currencyCode: code,
      setCurrencyCode,
      format,
      currencies: CURRENCIES,
      // Web-parity additions
      dashboardCurrency,
      paymentCurrency,
      changeDashboardCurrency,
      changePaymentCurrency,
      fmt,
      CURRENCY_META,
      ALL_CURRENCIES,
    }),
    [
      currency,
      code,
      format,
      dashboardCurrency,
      paymentCurrency,
      changeDashboardCurrency,
      changePaymentCurrency,
      fmt,
    ],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
