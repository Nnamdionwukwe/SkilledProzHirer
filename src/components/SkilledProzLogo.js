// src/components/SkilledProzLogo.js
import React from "react";
import AppText from "./AppText";

/**
 * The "skilled proz" wordmark used at the top of auth screens.
 * Uses the Syne display font - matches the bold treatment in screenshots.
 */
export default function SkilledProzLogo({ size = "lg", style }) {
  const variant = size === "sm" ? "title" : "displaySm";
  return (
    <AppText
      variant={variant}
      weight="displayBlack"
      style={[{ letterSpacing: -0.5 }, style]}
    >
      SkilledProz
    </AppText>
  );
}
