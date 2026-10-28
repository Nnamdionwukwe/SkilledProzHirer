// src/lib/voiceSocket.js
//
// Socket.IO client for the voice-call signaling namespace.
// Ported verbatim from web src/lib/voiceSocket.js.
//
// The socket is a singleton. getVoiceSocket() returns the same instance
// across reconnects. Only disconnectVoiceSocket() tears it down for good.

import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const RAW_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.skilledproz.com/api";

// Strip trailing "/api" — the socket namespace lives at the server root.
const SOCKET_BASE = RAW_API_URL.replace(/\/api\/?$/, "");

let socket = null;

const DEBUG_VOICE_CALL = true;
function log(...args) {
  if (!DEBUG_VOICE_CALL) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VS ${ts}]`, ...args);
}

export function getVoiceSocket() {
  if (socket) {
    log("getVoiceSocket() — returning existing", {
      connected: socket.connected,
      id: socket.id,
    });
    return socket;
  }

  const token = useAuthStore.getState().accessToken;
  log("getVoiceSocket() — creating NEW socket", { hasToken: !!token });

  if (!token) {
    log("no auth token — cannot connect");
    return null;
  }

  const url = `${SOCKET_BASE}/voice-calls`;
  log("connecting →", url);

  socket = io(url, {
    auth: { token },
    transports: ["websocket", "polling"],
    upgrade: true,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
    reconnectionAttempts: 50,
    randomizationFactor: 0.3,
    timeout: 20000,
  });

  socket.on("connect", () => {
    log("✅ connected", { id: socket.id });
  });

  socket.on("reconnect", (attempt) => {
    log("🔄 reconnected after", attempt, "attempts", { id: socket.id });
  });

  socket.on("reconnect_attempt", (attempt) => {
    log("reconnect attempt #" + attempt);
  });

  socket.on("connect_error", (err) => {
    log("❌ connect_error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    log("⚠️ disconnected:", reason);
    if (reason === "io server disconnect") {
      log("server kicked us — reconnecting manually");
      socket.connect();
    }
  });

  return socket;
}

export function disconnectVoiceSocket() {
  log("disconnectVoiceSocket() called");
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
