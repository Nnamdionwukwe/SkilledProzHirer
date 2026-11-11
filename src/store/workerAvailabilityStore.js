// src/store/workerAvailabilityStore.js
//
// Shared "Available for Bookings" state.
//
// Any screen that needs the toggle uses:
//   const { isAvailable, setAvailable, hydrate } = useWorkerAvailability();
//
// Changes from any screen propagate to all others instantly — dashboard pill,
// availability master switch, settings work-profile toggle, drawer badge,
// profile public view, etc.
//
// API:
//   PUT   /workers/profile   { isAvailable: boolean }   ← used by the store
//   (fallback) PATCH /settings/worker-profile { isAvailable }

import { create } from "zustand";
import client from "../api/client";

export const useWorkerAvailability = create((set, get) => ({
  isAvailable: true,
  loading: false,
  initialised: false,
  error: null,

  // Seed initial value — call from any /workers/:id or /settings/profile
  // response, or from authStore hydration.
  hydrate: (userOrProfile) => {
    const wp =
      userOrProfile?.workerProfile ?? userOrProfile?.profile ?? userOrProfile;
    const value = wp?.isAvailable ?? userOrProfile?.isAvailable ?? undefined;
    if (typeof value === "boolean") {
      set({ isAvailable: value, initialised: true });
    }
  },

  // Optimistic setter — flips local state, then PATCHes the backend.
  // On failure, rolls back and returns the error.
  setAvailable: async (next) => {
    const prev = get().isAvailable;
    if (prev === next) return;
    set({ isAvailable: next, loading: true, error: null });
    try {
      await client.put("/workers/profile", { isAvailable: next });
    } catch (err) {
      // Try the settings endpoint as a fallback — some backends only
      // accept the flag via /settings/worker-profile
      try {
        await client.patch("/settings/worker-profile", { isAvailable: next });
      } catch (err2) {
        set({
          isAvailable: prev,
          loading: false,
          error:
            err2?.response?.data?.message ||
            err?.response?.data?.message ||
            "Could not update availability.",
        });
        throw err2 || err;
      }
    }
    set({ loading: false });
  },

  // Refresh from server
  reload: async () => {
    try {
      const res = await client.get("/settings/profile");
      const wp = res.data?.data?.user?.workerProfile;
      if (wp) {
        set({
          isAvailable: wp.isAvailable ?? true,
          initialised: true,
          error: null,
        });
      }
    } catch {}
  },
}));
