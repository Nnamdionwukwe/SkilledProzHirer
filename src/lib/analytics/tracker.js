// src/lib/analytics/tracker.js
const enabled = __DEV__;
function log(kind, event, props) {
  if (!enabled) return;
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
