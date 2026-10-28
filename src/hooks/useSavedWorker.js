// src/hooks/useSavedWorker.js
//
// Port of the web hook. Tracks whether a worker is saved by the current
// hirer, and provides toggle() to save/unsave.

import { useCallback, useEffect, useRef, useState } from "react";
import client from "../api/client";

export default function useSavedWorker(workerId, { enabled = true } = {}) {
  const [isSaved, setIsSaved] = useState(false);
  const [checking, setChecking] = useState(enabled && !!workerId);
  const [toggling, setToggling] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !workerId) {
      setChecking(false);
      return;
    }
    cancelledRef.current = false;
    setChecking(true);

    client
      .get(`/hirers/me/saved-workers/${workerId}/exists`)
      .then((res) => {
        if (cancelledRef.current) return;
        setIsSaved(!!res?.data?.data?.saved);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelledRef.current) setChecking(false);
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [workerId, enabled]);

  const toggle = useCallback(async () => {
    if (!workerId || toggling) return;
    setToggling(true);
    const next = !isSaved;
    setIsSaved(next);

    try {
      if (next) {
        await client.post(`/hirers/me/saved-workers/${workerId}`);
      } else {
        await client.delete(`/hirers/me/saved-workers/${workerId}`);
      }
    } catch {
      setIsSaved(!next);
    } finally {
      setToggling(false);
    }
  }, [workerId, isSaved, toggling]);

  return { isSaved, checking, toggling, toggle };
}
