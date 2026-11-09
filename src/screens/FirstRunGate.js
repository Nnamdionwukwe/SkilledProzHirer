// src/screens/FirstRunGate.js
import React, { useEffect, useState } from "react";
import IntroScreen, { hasSeenIntro } from "./IntroScreen";
import AppLoadingSkeleton from "../components/SkeletonLoader";
import { useAuthStore } from "../store/authStore";

export default function FirstRunGate({ children }) {
  const [phase, setPhase] = useState("checking"); // checking | intro | loading | ready
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  // Decide first phase: intro (first run) vs loading (subsequent runs)
  useEffect(() => {
    (async () => {
      const seen = await hasSeenIntro();
      setPhase(seen ? "loading" : "intro");
    })();
  }, []);

  // Kick off auth hydration in parallel with intro / skeleton.
  // Safe to call multiple times — zustand store just re-runs.
  useEffect(() => {
    if (phase === "loading" || phase === "intro") {
      hydrate().catch(() => {});
    }
  }, [phase]);

  // Once hydrating is done and we're on the loading phase → go to app.
  useEffect(() => {
    if (phase === "loading" && isHydrated) setPhase("ready");
  }, [phase, isHydrated]);

  if (phase === "checking") return null; // native splash still up
  if (phase === "intro")
    return <IntroScreen onDone={() => setPhase("loading")} />;
  if (phase === "loading") return <AppLoadingSkeleton />;
  return children;
}
