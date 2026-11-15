// src/services/callKeepBridge.js
//
// Listens to the native CallKit / ConnectionService UI and forwards
// Accept/Decline to the backend + navigation.

import RNCallKeep from "react-native-callkeep";
import { navigationRef } from "../navigation/navigationRef";
import client from "../api/client";

export function initCallKeep() {
  RNCallKeep.setup({
    ios: { appName: "SkilledProz" },
    android: {
      alertTitle: "Permissions required",
      alertDescription: "This app needs phone account access to show calls",
      cancelButton: "Cancel",
      okButton: "OK",
      selfManaged: true,
    },
  });

  RNCallKeep.addEventListener("answerCall", async ({ callUUID }) => {
    try {
      await client.patch(`/video-calls/${callUUID}/accept`);
    } catch {
      try {
        await client.patch(`/voice-calls/${callUUID}/accept`);
      } catch {}
    }
    RNCallKeep.setCurrentCallActive(callUUID);
    RNCallKeep.backToForeground();

    async function ensureAuthReady() {
      const { isHydrated } = useAuthStore.getState();
      if (isHydrated) return true;
      // Wait up to 3 seconds for hydration
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 100));
        if (useAuthStore.getState().isHydrated) return true;
      }
      return false;
    }

    // At the top of the answerCall handler:
    if (!(await ensureAuthReady())) {
      console.warn("Auth not ready — cannot accept call");
      return;
    }

    // Navigation is handled by your existing banner/context once the app
    // resumes — or you can navigate directly here if you have the params.
    // For simplicity: let the poller pick up the ACTIVE state and route.
  });

  RNCallKeep.addEventListener("endCall", async ({ callUUID }) => {
    try {
      await client.patch(`/video-calls/${callUUID}/decline`);
    } catch {
      try {
        await client.patch(`/voice-calls/${callUUID}/decline`);
      } catch {}
    }
  });
}
