// src/hooks/useVoiceCallWebRTC.js
//
// Manages one WebRTC voice-call session.
//
// CRITICAL FIX: the receiver's RTCPeerConnection is created after
// getUserMedia resolves, which can take several hundred milliseconds. If
// the caller's offer arrives before the PC exists, the previous version
// silently dropped it and the call never connected.
//
// This version buffers the offer in `pendingOfferRef` and applies it as
// soon as the PC is ready. Symmetric fix for the answer.

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
  const pendingOfferRef = useRef(null); // ← NEW: buffered offer
  const pendingAnswerRef = useRef(null); // ← NEW: buffered answer
  const startedRef = useRef(false);
  const offeringRef = useRef(false);
  const hasJoinedRef = useRef(false);

  const getIsInitiatorRef = useRef(getIsInitiator);
  useEffect(() => {
    getIsInitiatorRef.current = getIsInitiator;
  }, [getIsInitiator]);

  const cleanup = useCallback(() => {
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
    if (!conversationId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    let socket = null;

    // ── Deferred offer/answer appliers ─────────────────────────────────
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
        if (
          pcLocal.signalingState === "have-local-offer" ||
          pcLocal.signalingState === "have-remote-offer"
        ) {
          try {
            await pcLocal.setLocalDescription({ type: "rollback" });
          } catch {}
        }
        await pcLocal.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pcLocal.createAnswer();
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
          await pcLocal.setRemoteDescription(new RTCSessionDescription(sdp));
          for (const c of pendingIceRef.current) {
            try {
              await pcLocal.addIceCandidate(new RTCIceCandidate(c));
            } catch {}
          }
          pendingIceRef.current = [];
          log("✅ applied answer");
        }
      } catch (err) {
        logErr("applyAnswer failed:", err);
      }
    };

    async function start() {
      try {
        setStatus("requesting-mic");

        const stream = await mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, stream);
          } catch (e) {
            logErr("addTrack failed:", e);
          }
        });

        pc.ontrack = (event) => {
          const incoming = event.streams[0];
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
        };

        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          socketRef.current?.emit("voice:ice", {
            conversationId,
            candidate: event.candidate.toJSON(),
          });
        };

        pc.onconnectionstatechange = () => {
          const s = pc.connectionState;
          if (s === "connected") setStatus("connected");
          else if (s === "connecting") setStatus("connecting");
          else if (s === "disconnected") setStatus("disconnected");
          else if (s === "failed") setStatus("failed");
        };

        socket = getVoiceSocket();
        if (!socket) {
          setError("Could not connect to signaling server");
          setStatus("failed");
          return;
        }
        socketRef.current = socket;

        // ── Apply any offer/answer that arrived before the PC existed ──
        if (pendingOfferRef.current) {
          log("applying buffered offer (post-PC creation)");
          await applyOfferIfReady();
        }
        if (pendingAnswerRef.current) {
          log("applying buffered answer (post-PC creation)");
          await applyAnswerIfReady();
        }

        const joinRoom = (reason) => {
          if (hasJoinedRef.current) return;
          hasJoinedRef.current = true;
          socket.emit("voice:join", { conversationId }, (resp) => {
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
          if (!initiating) return;

          offeringRef.current = true;
          try {
            if (pcLocal.signalingState === "have-local-offer") {
              try {
                await pcLocal.setLocalDescription({ type: "rollback" });
              } catch {}
            }
            setStatus("connecting");
            const offer = await pcLocal.createOffer({
              offerToReceiveAudio: true,
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
          setStatus("connecting");
        };

        const onSocketReconnect = () => {
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
