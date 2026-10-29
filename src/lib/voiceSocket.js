// src/lib/voiceSocket.js
//
// Socket.IO client for the voice-call signaling namespace.
// Token comes from the same tokenStore that client.js uses — reading
// useAuthStore.accessToken was failing because the store doesn't expose
// that field. tokenStore.getAccess() is async, so getVoiceSocket() is
// now async too.

import { io } from "socket.io-client";
import { tokenStore } from "../api/client";

const RAW_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.skilledproz.com/api";

// Strip trailing "/api" — the socket namespace lives at the server root.
const SOCKET_BASE = RAW_API_URL.replace(/\/api\/?$/, "");

let socket = null;
let connectingPromise = null;

const DEBUG_VOICE_CALL = true;
function log(...args) {
  if (!DEBUG_VOICE_CALL) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VS ${ts}]`, ...args);
}

export async function getVoiceSocket() {
  if (socket) {
    log("getVoiceSocket() — returning existing", {
      connected: socket.connected,
      id: socket.id,
    });
    return socket;
  }

  // Serialize concurrent calls — if two useEffects fire getVoiceSocket()
  // at once, only the first should create the socket.
  if (connectingPromise) {
    log("getVoiceSocket() — awaiting in-flight creation");
    return connectingPromise;
  }

  connectingPromise = (async () => {
    const token = await tokenStore.getAccess();
    log("getVoiceSocket() — creating NEW socket", { hasToken: !!token });

    if (!token) {
      log("no auth token — cannot connect");
      connectingPromise = null;
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

    connectingPromise = null;
    return socket;
  })();

  return connectingPromise;
}

export function disconnectVoiceSocket() {
  log("disconnectVoiceSocket() called");
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  connectingPromise = null;
}
