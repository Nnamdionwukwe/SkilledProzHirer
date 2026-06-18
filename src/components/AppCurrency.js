// src/components/AppCurrency.js
import React from "react";
import AppText from "./AppText";
import { useCurrency } from "../contexts/CurrencyContext";

/**
 * AppCurrency — render a monetary amount.
 *
 *   <AppCurrency amount={1500} />                     // uses global currency
 *   <AppCurrency amount={1500} currencyCode="NGN" />  // overrides for this instance
 *   <AppCurrency amount={1500} variant="title" />     // any AppText variant
 *
 * This is intentionally a thin component so screens never have to know how
 * formatting works for a given user's locale.
 */
export default function AppCurrency({
  amount,
  currencyCode,
  variant = "body",
  weight,
  tone,
  style,
  minimumFractionDigits,
  maximumFractionDigits,
}) {
  const { format } = useCurrency();
  const text = format(amount, {
    currencyCode,
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return (
    <AppText variant={variant} weight={weight} tone={tone} style={style}>
      {text}
    </AppText>
  );
}
