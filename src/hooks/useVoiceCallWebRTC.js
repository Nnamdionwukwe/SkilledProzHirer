// src/hooks/useVoiceCallWebRTC.js
import { useEffect, useRef, useState, useCallback } from "react";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  mediaDevices,
} from "react-native-webrtc";
import { getVoiceSocket } from "../lib/voiceSocket";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:157.90.20.7:3478",
    username: "skilledproz",
    credential: "SkilledProz2026!", // Use the exact password you set in turnserver.conf
  },
];

const DEBUG_VOICE_CALL = true;
function log(...args) {
  if (!DEBUG_VOICE_CALL) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[WRTC ${ts}]`, ...args);
}
function logErr(...args) {
  const ts = new Date().toISOString().slice(11, 23);
  console.error(`[WRTC ${ts}]`, ...args);
}

export default function useVoiceCallWebRTC({ conversationId, getIsInitiator }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceRef = useRef([]);
  const pendingOfferRef = useRef(null);
  const pendingAnswerRef = useRef(null);
  const startedRef = useRef(false);
  const offeringRef = useRef(false);
  const hasJoinedRef = useRef(false);

  const getIsInitiatorRef = useRef(getIsInitiator);
  useEffect(() => {
    getIsInitiatorRef.current = getIsInitiator;
  }, [getIsInitiator]);

  const cleanup = useCallback(() => {
    log("cleanup()");
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setStatus("idle");
    setError(null);
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    pendingAnswerRef.current = null;
    offeringRef.current = false;
    hasJoinedRef.current = false;
    startedRef.current = false;
  }, []);

  useEffect(() => {
    log("useEffect fired", { conversationId, started: startedRef.current });
    if (!conversationId) {
      log("no conversationId — bailing");
      return;
    }
    if (startedRef.current) {
      log("already started — bailing");
      return;
    }
    startedRef.current = true;

    let cancelled = false;
    let socket = null;

    const applyOfferIfReady = async () => {
      const pc = pcRef.current;
      const pending = pendingOfferRef.current;
      if (!pc || !pending) return;
      pendingOfferRef.current = null;
      await applyOffer(pending);
    };

    const applyAnswerIfReady = async () => {
      const pc = pcRef.current;
      const pending = pendingAnswerRef.current;
      if (!pc || !pending) return;
      pendingAnswerRef.current = null;
      await applyAnswer(pending);
    };

    const applyOffer = async ({ sdp }) => {
      const pcLocal = pcRef.current;
      if (!pcLocal) return;
      try {
        log("📥 applying offer...");
        if (
          pcLocal.signalingState === "have-local-offer" ||
          pcLocal.signalingState === "have-remote-offer"
        ) {
          try {
            await pcLocal.setLocalDescription({ type: "rollback" });
          } catch {}
        }
        await pcLocal.setRemoteDescription(new RTCSessionDescription(sdp));

        // Ensure answer explicitly receives audio
        const answer = await pcLocal.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await pcLocal.setLocalDescription(answer);
        socket.emit("voice:answer", { conversationId, sdp: answer });
        log("✅ sent answer");

        for (const c of pendingIceRef.current) {
          try {
            await pcLocal.addIceCandidate(new RTCIceCandidate(c));
          } catch {}
        }
        pendingIceRef.current = [];
      } catch (err) {
        logErr("applyOffer failed:", err);
      }
    };

    const applyAnswer = async ({ sdp }) => {
      const pcLocal = pcRef.current;
      if (!pcLocal) return;
      try {
        if (pcLocal.signalingState === "have-local-offer") {
          log("📥 applying answer...");
          await pcLocal.setRemoteDescription(new RTCSessionDescription(sdp));
          for (const c of pendingIceRef.current) {
            try {
              await pcLocal.addIceCandidate(new RTCIceCandidate(c));
            } catch {}
          }
          pendingIceRef.current = [];
          log("✅ applied answer");
        } else {
          log(
            "applyAnswer: signalingState =",
            pcLocal.signalingState,
            "— ignoring",
          );
        }
      } catch (err) {
        logErr("applyAnswer failed:", err);
      }
    };

    async function start() {
      try {
        setStatus("requesting-mic");
        log("requesting mic...");

        // SIMPLIFIED CONSTRAINTS: Some native devices fail silently
        // if echoCancellation/noiseSuppression are passed explicitly.
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        log("🎤 local stream ready", {
          audioTracks: stream.getAudioTracks().length,
        });

        // Use standard WebRTC configuration
        const pc = new RTCPeerConnection({
          iceServers: ICE_SERVERS,
          sdpSemantics: "unified-plan",
        });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, stream);
            log("added local track", track.kind);
          } catch (e) {
            logErr("addTrack failed:", e);
          }
        });

        // ── Remote Track Diagnostics ──
        pc.ontrack = (event) => {
          const incoming = event.streams[0];
          log("📥 ontrack fired!", {
            kind: event.track.kind,
            enabled: event.track.enabled,
            muted: event.track.muted,
            readyState: event.track.readyState,
          });

          // FORCE the incoming track to be enabled and unmuted
          event.track.enabled = true;

          const current = remoteStreamRef.current;
          const next = new MediaStream();
          const tracks = current
            ? [...current.getTracks(), ...incoming.getTracks()]
            : [...incoming.getTracks()];

          const seen = new Set();
          for (const t of tracks) {
            if (seen.has(t.id)) continue;
            seen.add(t.id);
            next.addTrack(t);
          }

          remoteStreamRef.current = next;
          setRemoteStream(next);

          log("📥 remoteStream updated", {
            trackCount: next.getTracks().length,
            audioTracks: next.getAudioTracks().length,
          });
        };

        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            log("ICE gathering complete");
            return;
          }
          log("ICE candidate generated");
          socketRef.current?.emit("voice:ice", {
            conversationId,
            candidate: event.candidate.toJSON(),
          });
        };

        pc.onconnectionstatechange = () => {
          const s = pc.connectionState;
          log("⚠️ connectionState changed:", s);
          if (s === "connected") setStatus("connected");
          else if (s === "connecting") setStatus("connecting");
          else if (s === "disconnected") setStatus("disconnected");
          else if (s === "failed") setStatus("failed");
        };

        pc.oniceconnectionstatechange = () => {
          log("⚠️ iceConnectionState changed:", pc.iceConnectionState);
        };

        socket = await getVoiceSocket();
        if (cancelled) return;
        if (!socket) {
          setError("Could not connect to signaling server");
          setStatus("failed");
          return;
        }
        socketRef.current = socket;
        log("socket acquired", { connected: socket.connected, id: socket.id });

        if (pendingOfferRef.current) {
          log("applying buffered offer");
          await applyOfferIfReady();
        }
        if (pendingAnswerRef.current) {
          log("applying buffered answer");
          await applyAnswerIfReady();
        }

        const joinRoom = (reason) => {
          if (hasJoinedRef.current) return;
          hasJoinedRef.current = true;
          log(`emitting voice:join [${reason}]`, { conversationId });
          socket.emit("voice:join", { conversationId }, (resp) => {
            log("voice:join response", resp);
            if (!resp?.ok) {
              hasJoinedRef.current = false;
              setError(resp?.error || "Failed to join call room");
              setStatus("failed");
            }
          });
        };

        if (socket.connected) {
          joinRoom("socket already connected");
        } else {
          socket.once("connect", () => joinRoom("initial connect"));
        }

        const createAndSendOffer = async (trigger) => {
          const pcLocal = pcRef.current;
          if (!pcLocal) return;
          if (offeringRef.current) return;
          const initiating = getIsInitiatorRef.current?.();
          if (!initiating) {
            log(`createAndSendOffer [${trigger}]: not initiator`);
            return;
          }

          offeringRef.current = true;
          try {
            if (pcLocal.signalingState === "have-local-offer") {
              try {
                await pcLocal.setLocalDescription({ type: "rollback" });
              } catch {}
            }
            setStatus("connecting");
            log("creating offer...");
            const offer = await pcLocal.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: false,
            });
            await pcLocal.setLocalDescription(offer);
            socket.emit("voice:offer", { conversationId, sdp: offer });
            log("✅ sent offer");
          } catch (err) {
            logErr("createOffer failed:", err);
          } finally {
            setTimeout(() => {
              offeringRef.current = false;
            }, 1500);
          }
        };

        const onPeerJoined = async () => {
          const initiating = getIsInitiatorRef.current?.();
          log(`🎯 peer-joined — isInitiator=${initiating}`);
          if (!initiating || !pcRef.current) return;
          setTimeout(() => createAndSendOffer("peer-joined"), 250);
        };

        const onOffer = async ({ sdp }) => {
          if (!pcRef.current) {
            log("📥 offer arrived BEFORE PC — buffering");
            pendingOfferRef.current = { sdp };
            return;
          }
          log("📥 received offer — applying");
          await applyOffer({ sdp });
        };

        const onAnswer = async ({ sdp }) => {
          if (!pcRef.current) {
            log("📥 answer arrived BEFORE PC — buffering");
            pendingAnswerRef.current = { sdp };
            return;
          }
          log("📥 received answer — applying");
          await applyAnswer({ sdp });
        };

        const onIce = async ({ candidate }) => {
          const pcLocal = pcRef.current;
          if (!pcLocal) {
            pendingIceRef.current.push(candidate);
            return;
          }
          if (pcLocal.remoteDescription?.type) {
            try {
              await pcLocal.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {}
          } else {
            pendingIceRef.current.push(candidate);
          }
        };

        const onPeerLeft = () => {
          log("peer left");
          setStatus("connecting");
        };

        const onSocketReconnect = () => {
          log("socket reconnect — rejoining room");
          hasJoinedRef.current = false;
          joinRoom("socket reconnect");
        };

        socket.on("voice:peer-joined", onPeerJoined);
        socket.on("voice:offer", onOffer);
        socket.on("voice:answer", onAnswer);
        socket.on("voice:ice", onIce);
        socket.on("voice:peer-left", onPeerLeft);
        socket.on("connect", onSocketReconnect);

        socketRef.current.__voiceHandlers = {
          onPeerJoined,
          onOffer,
          onAnswer,
          onIce,
          onPeerLeft,
          onSocketReconnect,
        };
      } catch (err) {
        logErr("setup failed:", err);
        if (err.name === "NotAllowedError") {
          setError(
            "Microphone permission denied. Enable it in your device settings.",
          );
        } else if (err.name === "NotFoundError") {
          setError("No microphone found on this device.");
        } else {
          setError(err.message || "Failed to start call");
        }
        setStatus("failed");
      }
    }

    start();

    return () => {
      log("useEffect cleanup running");
      cancelled = true;
      if (socket) {
        try {
          socket.emit("voice:leave", { conversationId });
          const h = socket.__voiceHandlers;
          if (h) {
            socket.off("voice:peer-joined", h.onPeerJoined);
            socket.off("voice:offer", h.onOffer);
            socket.off("voice:answer", h.onAnswer);
            socket.off("voice:ice", h.onIce);
            socket.off("voice:peer-left", h.onPeerLeft);
            socket.off("connect", h.onSocketReconnect);
          }
          delete socket.__voiceHandlers;
        } catch {}
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getAudioTracks();
    const next = !isMuted;
    tracks.forEach((t) => (t.enabled = !next));
    setIsMuted(next);
    log("toggleMute →", next ? "muted" : "unmuted");
  }, [isMuted]);

  return {
    localStream,
    remoteStream,
    status,
    isMuted,
    error,
    toggleMute,
  };
}
