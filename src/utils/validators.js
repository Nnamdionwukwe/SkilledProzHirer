// src/utils/validators.js
export const isEmail = (v = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

export const isStrongEnoughPassword = (v = "") => String(v).length >= 8;

export const isNonEmpty = (v) => v !== undefined && v !== null && String(v).trim().length > 0;
