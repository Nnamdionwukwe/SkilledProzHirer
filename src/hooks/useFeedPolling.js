// src/hooks/useFeedPolling.js
//
// Ported from src/hooks/useFeedPolling.js.
// document.hidden → AppState.currentState !== "active".
// window "online" event → RN has no equivalent; dropped.
// visibilitychange → AppState.addEventListener("change", ...).

import { useEffect, useRef, useState, useCallback } from "react";
import { AppState } from "react-native";
import client from "../api/client";

export default function useFeedPolling({
  filter = "ALL",
  currentPosts = [],
  intervalMs = 25000,
  enabled = true,
} = {}) {
  const [pendingPosts, setPendingPosts] = useState([]);

  const filterRef = useRef(filter);
  const postsRef = useRef(currentPosts);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);
  useEffect(() => {
    postsRef.current = currentPosts;
  }, [currentPosts]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    setPendingPosts([]);
  }, [filter]);

  const runPoll = useCallback(async () => {
    if (!enabledRef.current) return;
    if (AppState.currentState !== "active") return;

    try {
      const res = await client.get("/posts/feed", {
        params: {
          page: 1,
          limit: 15,
          ...(filterRef.current !== "ALL" && { type: filterRef.current }),
        },
      });

      const fresh = res?.data?.data?.posts ?? [];
      if (!fresh.length) return;

      const knownIds = new Set(postsRef.current.map((p) => p.id));
      const queuedIds = new Set(pendingPosts.map((p) => p.id));
      const brandNew = fresh.filter(
        (p) => !knownIds.has(p.id) && !queuedIds.has(p.id),
      );

      if (brandNew.length) {
        setPendingPosts((prev) => {
          const merged = [...brandNew, ...prev];
          const seen = new Set();
          return merged.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
        });
      }
    } catch {
      // swallow — polling must never break the UI
    }
  }, [pendingPosts]);

  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(runPoll, intervalMs);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") runPoll();
    });

    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [enabled, intervalMs, runPoll]);

  const dismissPending = () => setPendingPosts([]);
  const clearPending = () => setPendingPosts([]);

  return { pendingPosts, dismissPending, clearPending };
}
