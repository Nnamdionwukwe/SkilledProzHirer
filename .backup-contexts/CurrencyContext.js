// src/contexts/CurrencyContext.js
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CURRENCIES, getCurrency } from "../constants/currencies";

const STORAGE_KEY = "@skilledproz:currency";

const CurrencyContext = createContext({
  currency: CURRENCIES[0],
  setCurrencyCode: () => {},
  format: () => "",
});

export function CurrencyProvider({ children, initialCode = "USD" }) {
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setCode(saved);
      } catch {}
    })();
  }, []);

  const setCurrencyCode = async (next) => {
    setCode(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const currency = getCurrency(code);

  /**
   * format(amount, opts?) → string
   *  - If `currencyCode` is passed in opts, use that currency (per-component override).
   *  - Otherwise use the global currency.
   *  - Uses Intl.NumberFormat for locale-aware grouping when available.
   */
  const format = useMemo(
    () =>
      (amount, opts = {}) => {
        const targetCode = opts.currencyCode || code;
        const target = getCurrency(targetCode);
        const num = Number(amount ?? 0);

        try {
          // Intl is available in modern RN (Hermes 0.74+)
          return new Intl.NumberFormat(opts.locale || undefined, {
            style: "currency",
            currency: targetCode,
            minimumFractionDigits: opts.minimumFractionDigits ?? 0,
            maximumFractionDigits: opts.maximumFractionDigits ?? 2,
          }).format(num);
        } catch {
          // Fallback if Intl unavailable for that currency
          const formatted = num.toLocaleString(undefined, {
            minimumFractionDigits: opts.minimumFractionDigits ?? 0,
            maximumFractionDigits: opts.maximumFractionDigits ?? 2,
          });
          return `${target.symbol}${formatted}`;
        }
      },
    [code],
  );

  const value = useMemo(
    () => ({
      currency,
      currencyCode: code,
      setCurrencyCode,
      format,
      currencies: CURRENCIES,
    }),
    [currency, code, format],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
