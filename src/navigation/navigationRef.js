// src/navigation/navigationRef.js
//
// Global navigation ref + drawer helpers.
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
