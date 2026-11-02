// src/hooks/useDebounce.js
//
// Ported from the web's inline setTimeout pattern in AddStaffModal.jsx
// (searchDebounce useRef + setTimeout 350ms). Extracted so it's reusable.

import { useEffect, useRef, useState } from "react";

export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useDebouncedCallback(fn, delay = 350) {
  const timer = useRef(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  return (...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delay);
  };
}
