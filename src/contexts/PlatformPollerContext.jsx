// src/contexts/PlatformPollerContext.jsx
//
// Global silent background refresh.
//
// Mounted once at the app root. Every 5 seconds it fires every registered
// "listener" (any screen that opted in via usePlatformRefresh). Fetchers run
// concurrently, errors are swallowed, and no UI state changes.
//
// Rules:
//   · Only fires when the app is foregrounded (AppState === "active").
//   · Skips listeners whose owner screen has passed `enabled: false`.
//   · Polls every 5s — change POLL_INTERVAL_MS to adjust.
//   · Errors are logged to console.warn but never surfaced to the user.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { AppState } from "react-native";

const POLL_INTERVAL_MS = 5000;

const PlatformPollerContext = createContext({
  register: () => () => {},
  refreshNow: async () => {},
});

export function PlatformPollerProvider({ children }) {
  // Map<id, { fetch, enabledRef }>
  const listenersRef = useRef(new Map());
  const idCounterRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const inFlightRef = useRef(false);
  const tickRef = useRef(null);

  // ── AppState listener — pause polling when backgrounded ────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  // ── Register a listener — returns the unregister function ──────────
  const register = useCallback((fetchFn, enabledRef) => {
    const id = ++idCounterRef.current;
    listenersRef.current.set(id, { fetch: fetchFn, enabledRef });
    return () => {
      listenersRef.current.delete(id);
    };
  }, []);

  // ── Refresh everything right now (used on focus/resume) ────────────
  const refreshNow = useCallback(async () => {
    if (appStateRef.current !== "active") return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const tasks = [];
    for (const { fetch, enabledRef } of listenersRef.current.values()) {
      if (!enabledRef?.current) continue;
      tasks.push(
        Promise.resolve()
          .then(() => fetch())
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.warn("[PlatformPoller] fetch failed:", err?.message);
          }),
      );
    }
    await Promise.allSettled(tasks);
    inFlightRef.current = false;
  }, []);

  // ── Heartbeat ──────────────────────────────────────────────────────
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      refreshNow();
    }, POLL_INTERVAL_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [refreshNow]);

  // ── Fire once when the app returns to foreground ───────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") refreshNow();
    });
    return () => sub.remove();
  }, [refreshNow]);

  return (
    <PlatformPollerContext.Provider value={{ register, refreshNow }}>
      {children}
    </PlatformPollerContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────
//
// Usage inside a screen:
//
//   const fetchData = useCallback(async (silent = false) => {
//     if (!silent) setLoading(true);
//     const data = await client.get(...);
//     setData(data);
//     if (!silent) setLoading(false);
//   }, []);
//
//   usePlatformRefresh(fetchData, /* enabled */ true);
//
// Notes:
//   · fetchData is called with no args — treat as silent. If you want
//     the same function to also work as a normal loader, use the optional
//     `silent` argument to skip spinners.
//   · `enabled` can be a boolean or a ref. If a ref, the poller reads
//     `enabledRef.current` on each tick (see `usePlatformRefresh` below).
//   · The poller never calls fetchData on mount; it only fires on the
//     heartbeat. Initial fetch is the screen's responsibility (as today).
export function usePlatformRefresh(fetchFn, enabled = true) {
  const ctx = useContext(PlatformPollerContext);
  const fetchRef = useRef(fetchFn);
  const enabledRef = useRef(enabled);

  // Keep refs current so consumers don't have to memoise fetchFn
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!ctx?.register) return;
    const unregister = ctx.register(() => fetchRef.current(), enabledRef);
    return unregister;
  }, [ctx]);
}

// ── Manual trigger for on-demand refresh ─────────────────────────
// (e.g. after a mutation, you can ask the whole app to refetch)
export function usePlatformRefreshNow() {
  const { refreshNow } = useContext(PlatformPollerContext);
  return refreshNow;
}

export default PlatformPollerContext;
