// src/navigation/DrawerNavContext.js
//
// Exposes the "real" drawer navigation object to every screen in the tree.
// Because WorkerHome and Dashboard are separate Stack children from the
// screens that need to open the drawer (BookingDetail, InterviewCallRoom,
// etc.), the drawer isn't an ancestor of those screens in the navigation
// tree. This context is the bridge.

import { createContext, useContext } from "react";

export const DrawerNavContext = createContext(null);

export function useDrawerNavigation() {
  return useContext(DrawerNavContext);
}
