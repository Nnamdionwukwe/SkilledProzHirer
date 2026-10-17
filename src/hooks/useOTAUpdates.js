// src/hooks/useOTAUpdates.js
//
// Silently checks for and applies EAS OTA JS bundle updates.
// Behaviour:
//   - On mount, checks the configured updates.url for a newer bundle
//   - If found, downloads it in the background (no UI blocking)
//   - Applies it silently on the NEXT cold start (not this session)
//   - Never throws — all errors are logged in dev only
//
// Design rationale:
//   We deliberately do NOT force reload the app mid-session. Users get the
//   new bundle the next time they kill + reopen the app. This avoids the
//   jarring UX of a sudden screen reset while they're mid-task.

import { useEffect } from "react";
import * as Updates from "expo-updates";

export default function useOTAUpdates() {
  useEffect(() => {
    let cancelled = false;

    async function checkForUpdates() {
      // In dev mode, OTA doesn't apply (Metro serves the bundle live).
      if (__DEV__) return;

      try {
        const update = await Updates.checkForUpdateAsync();
        if (cancelled || !update.isAvailable) return;

        // Download in the background — this is fast and safe.
        const fetched = await Updates.fetchUpdateAsync();
        if (cancelled) return;

        // Do NOT call Updates.reloadAsync() here. The new bundle will apply
        // automatically on the next cold start. Silent, non-disruptive.
        if (__DEV__ && fetched.isNew) {
          console.log("[OTA] New bundle downloaded — will apply on next launch.");
        }
      } catch (err) {
        // Never crash the app over an OTA check.
        if (__DEV__) {
          console.log("[OTA] Update check failed (non-fatal):", err?.message);
        }
      }
    }

    checkForUpdates();

    return () => {
      cancelled = true;
    };
  }, []);
}
