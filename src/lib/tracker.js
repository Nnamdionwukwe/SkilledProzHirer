// src/lib/analytics/tracker.js
//
// No-op analytics stub. Mirrors the web tracker API so ported screens
// that call `tracker.track(...)` / `tracker.action(...)` compile without
// further changes.
//
// To wire real analytics later (Amplitude / PostHog / Firebase), replace
// the console.logs below with the real SDK call. Every call site stays
// identical — no edits across the app.

const enabled = __DEV__;

function log(kind, event, props) {
  if (!enabled) return;
  // Uncomment the next line for local event tracing during development.
  // console.log(`[tracker.${kind}]`, event, props);
}

const tracker = {
  track: (event, props) => log("track", event, props),
  action: (event, props) => log("action", event, props),
  page: (event, props) => log("page", event, props),
  identify: (id, props) => log("identify", id, props),
  screen: (event, props) => log("screen", event, props),
  reset: () => log("reset", "user"),
};

export default tracker;
