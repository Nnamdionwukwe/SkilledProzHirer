// src/navigation/navigationRef.js
//
// Global navigation ref + drawer helpers + route-availability helpers.
//
// Drawer actions (openDrawer / closeDrawer / toggleDrawer) dispatched on the
// root ref propagate UP the navigator tree until they find a navigator that
// handles them. This makes them work regardless of how deeply the drawer is
// nested — which is now 3 levels deep (RootStack → RootBranch → Drawer).

import {
  createNavigationContainerRef,
  DrawerActions,
} from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function toggleDrawer() {
  if (!navigationRef.isReady()) return;
  try {
    navigationRef.dispatch(DrawerActions.toggleDrawer());
  } catch {}
}

export function openDrawer() {
  if (!navigationRef.isReady()) return;
  try {
    navigationRef.dispatch(DrawerActions.openDrawer());
  } catch {}
}

export function closeDrawer() {
  if (!navigationRef.isReady()) return;
  try {
    navigationRef.dispatch(DrawerActions.closeDrawer());
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════════
// Route-availability helpers — used by shared screens that must call a
// navigator-specific route only when it actually exists in the current
// navigator tree (e.g. `WorkerHome` exists in the Worker navigator but not
// the Hirer navigator).
// ════════════════════════════════════════════════════════════════════════════

/**
 * Returns true when the current navigator tree (starting from the given
 * `navigation` prop, or falling back to the root ref) contains a screen
 * named `name`. Safe to call at any time — returns false if the ref isn't
 * ready or the state is unreadable.
 */
export function hasRoute(navigation, name) {
  try {
    // ── 1. Walk DOWN from the current navigation state ────────────
    const startState = navigation
      ? navigation.getState?.()
      : navigationRef.isReady?.()
        ? navigationRef.getRootState()
        : null;

    const walkDown = (state) => {
      if (!state) return false;
      if (Array.isArray(state.routeNames) && state.routeNames.includes(name)) {
        return true;
      }
      for (const r of state.routes ?? []) {
        if (walkDown(r.state)) return true;
      }
      return false;
    };

    if (walkDown(startState)) return true;

    // ── 2. Walk UP through the navigation prop's parent chain ────
    // This is how `WorkerHome` is resolvable from a TopBar rendered
    // inside the WorkerDrawer: the current state is the Drawer state
    // (whose routeNames don't include "WorkerHome"), but a few levels
    // up is the Stack state that owns "WorkerHome".
    if (navigation) {
      let cursor = navigation;
      const seen = new Set();
      while (cursor) {
        // eslint-disable-next-line no-underscore-dangle
        const s = cursor.getState?.();
        if (s && !seen.has(s)) {
          seen.add(s);
          if (walkDown(s)) return true;
        }
        try {
          cursor = cursor.getParent?.();
        } catch {
          cursor = null;
        }
      }
    }

    // ── 3. Fallback — check the root ref ─────────────────────────
    if (navigationRef.isReady?.()) {
      const rootState = navigationRef.getRootState();
      if (walkDown(rootState)) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Navigate to `name` only if the current navigator hierarchy has that route.
 * Optionally falls back to `fallbackName` if the primary target doesn't
 * exist in this navigator.
 *
 * Returns true when navigation succeeded (either to `name` or to
 * `fallbackName`), false otherwise.
 *
 * Example:
 *   // Works whether we're inside the Worker navigator (has WorkerHome)
 *   // or the Hirer navigator (falls back to Bookings).
 *   safeNavigate(
 *     navigation,
 *     "WorkerHome",
 *     { screen: "WorkerBookings" },
 *     "Bookings",
 *   );
 */
export function safeNavigate(navigation, name, params, fallbackName = null) {
  try {
    if (hasRoute(navigation, name)) {
      navigation.navigate(name, params);
      return true;
    }
    if (fallbackName && hasRoute(navigation, fallbackName)) {
      navigation.navigate(fallbackName, params);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
