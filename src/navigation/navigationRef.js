// src/navigation/navigationRef.js
//
// Global navigation ref. Attached to NavigationContainer so we can navigate
// from outside React (e.g. from a push-notification tap handler in App.js).
//
// Do NOT use this in screens — use useNavigation() there.

import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
